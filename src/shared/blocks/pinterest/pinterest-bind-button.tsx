'use client';

import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/shared/components/ui/button';
import { Loader2, Link as LinkIcon, Unlink, Check, ExternalLink } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';

interface PinterestStatus {
  connected: boolean;
  accountId?: string;
  hasRefreshToken?: boolean;
  tokenExpired?: boolean;
  expiresAt?: string;
}

interface PinterestBindButtonProps {
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg';
  className?: string;
}

/**
 * Pinterest 绑定/解绑按钮组件
 * 用于用户绑定或解绑 Pinterest 账号
 */
export const PinterestBindButton = React.memo(function PinterestBindButton({
  variant = 'outline',
  size = 'default',
  className = '',
}: PinterestBindButtonProps) {
  const [status, setStatus] = useState<PinterestStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    const fetchStatus = async () => {
      try {
        const response = await fetch('/api/pinterest/status');
        if (response.ok) {
          const data = await response.json();
          if (mounted) {
            setStatus(data);
          }
        } else {
          if (mounted) {
            setStatus({ connected: false });
          }
        }
      } catch (error) {
        // Silently fail - just mark as not connected
        if (mounted) {
          setStatus({ connected: false });
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };
    fetchStatus();
    return () => {
      mounted = false;
    };
  }, []);

  // 绑定 Pinterest
  const handleBind = () => {
    setActionLoading(true);
    // 跳转到授权页面
    window.location.href = '/api/pinterest/authorize';
  };

  // 解绑 Pinterest
  const handleUnbind = async () => {
    if (!confirm('确定要解除 Pinterest 绑定吗？')) {
      return;
    }

    setActionLoading(true);
    try {
      const response = await fetch('/api/pinterest/status', {
        method: 'DELETE',
      });

      if (response.ok) {
        const data = await response.json();
        toast.success(data.message || '已解除 Pinterest 绑定');
        setStatus({ connected: false });
      } else {
        const error = await response.json();
        toast.error(error.error || '解绑失败');
      }
    } catch (error) {
      console.error('Failed to disconnect Pinterest:', error);
      toast.error('解绑失败，请重试');
    } finally {
      setActionLoading(false);
    }
  };

  // 加载中状态
  if (loading) {
    return (
      <Button variant={variant} size={size} className={className} disabled>
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        加载中...
      </Button>
    );
  }

  // 未绑定状态 - 显示绑定按钮
  if (!status?.connected) {
    return (
      <Button
        variant={variant}
        size={size}
        className={className}
        onClick={handleBind}
        disabled={actionLoading}
      >
        {actionLoading ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <LinkIcon className="mr-2 h-4 w-4" />
        )}
        绑定 Pinterest
      </Button>
    );
  }

  // 已绑定状态 - 显示绑定信息和解绑按钮
  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1 text-sm text-muted-foreground">
        <Check className="h-4 w-4 text-green-500" />
        <span>已绑定</span>
        {status.tokenExpired && (
          <span className="text-amber-500">(Token 已过期)</span>
        )}
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleUnbind}
        disabled={actionLoading}
      >
        {actionLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Unlink className="h-4 w-4" />
        )}
      </Button>
    </div>
  );
});


/**
 * 简单的分享到 Pinterest 按钮
 * 用于分享内容到 Pinterest
 */
export const PinterestShareButton = React.memo(function PinterestShareButton({
  mediaUrl,
  description,
  url,
  variant = 'outline',
  size = 'default',
  className = '',
}: {
  mediaUrl: string;
  description: string;
  url?: string;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg';
  className?: string;
}) {
  const [status, setStatus] = useState<PinterestStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [sharing, setSharing] = useState(false);
  const [successDialogOpen, setSuccessDialogOpen] = useState(false);
  const [pinUrl, setPinUrl] = useState('');

  useEffect(() => {
    let mounted = true;
    const fetchStatus = async () => {
      try {
        const response = await fetch('/api/pinterest/status');
        if (response.ok && mounted) {
          const data = await response.json();
          setStatus(data);
        }
      } catch (error) {
        // Silently fail - just mark as not connected
        if (mounted) {
          setStatus({ connected: false });
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };
    fetchStatus();
    return () => {
      mounted = false;
    };
  }, []);

  const handleShare = async () => {
    if (!status?.connected) {
      toast.error('请先绑定 Pinterest 账号');
      return;
    }

    if (status.tokenExpired) {
      toast.error('Pinterest Token 已过期，请重新绑定');
      return;
    }

    setSharing(true);
    try {
      const response = await fetch('/api/pinterest/share', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageUrl: mediaUrl,
          description: description,
          link: url || window.location.href,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setPinUrl(data.pin.url);
        setSuccessDialogOpen(true);
      } else {
        const error = await response.json();
        toast.error(error.error || '分享失败');
      }
    } catch (error) {
      console.error('Failed to share to Pinterest:', error);
      toast.error('分享失败，请重试');
    } finally {
      setSharing(false);
    }
  };

  const handleCloseDialog = () => {
    setSuccessDialogOpen(false);
    setPinUrl('');
  };

  if (loading) {
    return (
      <Button variant={variant} size={size} className={className} disabled>
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        分享到 Pinterest
      </Button>
    );
  }

  // 未绑定状态 - 显示跳转到设置页面的按钮
  if (!status?.connected) {
    return (
      <Button
        variant={variant}
        size={size}
        className={className}
        onClick={() => {
          if (typeof window !== 'undefined') {
            window.location.href = '/settings/integrations';
          }
        }}
      >
        <svg
          className="mr-2 h-4 w-4"
          viewBox="0 0 24 24"
          fill="currentColor"
        >
          <path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.162-.105-.949-.199-2.403.041-3.439.219-.937 1.406-5.957 1.406-5.957s-.359-.72-.359-1.781c0-1.663.967-2.911 2.168-2.911 1.024 0 1.518.769 1.518 1.688 0 1.029-.653 2.567-.992 3.992-.285 1.193.6 2.165 1.775 2.165 2.128 0 3.768-2.245 3.768-5.487 0-2.861-2.063-4.869-5.008-4.869-3.41 0-5.409 2.562-5.409 5.199 0 1.033.394 2.143.889 2.741.099.12.112.225.085.345-.09.375-.293 1.199-.334 1.363-.053.225-.172.271-.401.165-1.495-.69-2.433-2.878-2.433-4.646 0-3.776 2.748-7.252 7.92-7.252 4.158 0 7.392 2.967 7.392 6.923 0 4.135-2.607 7.462-6.233 7.462-1.214 0-2.354-.629-2.758-1.379l-.749 2.848c-.269 1.045-1.004 2.352-1.498 3.146 1.123.345 2.306.535 3.55.535 6.607 0 11.985-5.365 11.985-11.987C23.97 5.39 18.592.026 11.985.026L12.017 0z" />
        </svg>
        绑定 Pinterest
      </Button>
    );
  }

  // Token 已过期状态
  if (status.tokenExpired) {
    return (
      <Button
        variant={variant}
        size={size}
        className={className}
        onClick={() => {
          if (typeof window !== 'undefined') {
            window.location.href = '/settings/integrations';
          }
        }}
      >
        <svg
          className="mr-2 h-4 w-4"
          viewBox="0 0 24 24"
          fill="currentColor"
        >
          <path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.162-.105-.949-.199-2.403.041-3.439.219-.937 1.406-5.957 1.406-5.957s-.359-.72-.359-1.781c0-1.663.967-2.911 2.168-2.911 1.024 0 1.518.769 1.518 1.688 0 1.029-.653 2.567-.992 3.992-.285 1.193.6 2.165 1.775 2.165 2.128 0 3.768-2.245 3.768-5.487 0-2.861-2.063-4.869-5.008-4.869-3.41 0-5.409 2.562-5.409 5.199 0 1.033.394 2.143.889 2.741.099.12.112.225.085.345-.09.375-.293 1.199-.334 1.363-.053.225-.172.271-.401.165-1.495-.69-2.433-2.878-2.433-4.646 0-3.776 2.748-7.252 7.92-7.252 4.158 0 7.392 2.967 7.392 6.923 0 4.135-2.607 7.462-6.233 7.462-1.214 0-2.354-.629-2.758-1.379l-.749 2.848c-.269 1.045-1.004 2.352-1.498 3.146 1.123.345 2.306.535 3.55.535 6.607 0 11.985-5.365 11.985-11.987C23.97 5.39 18.592.026 11.985.026L12.017 0z" />
        </svg>
        重新绑定 Pinterest
      </Button>
    );
  }

  return (
    <>
      <Button
        variant={variant}
        size={size}
        className={className}
        onClick={handleShare}
        disabled={sharing}
      >
        {sharing ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <svg
            className="mr-2 h-4 w-4"
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.162-.105-.949-.199-2.403.041-3.439.219-.937 1.406-5.957 1.406-5.957s-.359-.72-.359-1.781c0-1.663.967-2.911 2.168-2.911 1.024 0 1.518.769 1.518 1.688 0 1.029-.653 2.567-.992 3.992-.285 1.193.6 2.165 1.775 2.165 2.128 0 3.768-2.245 3.768-5.487 0-2.861-2.063-4.869-5.008-4.869-3.41 0-5.409 2.562-5.409 5.199 0 1.033.394 2.143.889 2.741.099.12.112.225.085.345-.09.375-.293 1.199-.334 1.363-.053.225-.172.271-.401.165-1.495-.69-2.433-2.878-2.433-4.646 0-3.776 2.748-7.252 7.92-7.252 4.158 0 7.392 2.967 7.392 6.923 0 4.135-2.607 7.462-6.233 7.462-1.214 0-2.354-.629-2.758-1.379l-.749 2.848c-.269 1.045-1.004 2.352-1.498 3.146 1.123.345 2.306.535 3.55.535 6.607 0 11.985-5.365 11.985-11.987C23.97 5.39 18.592.026 11.985.026L12.017 0z" />
          </svg>
        )}
        {sharing ? '分享中...' : '分享到 Pinterest'}
      </Button>

      <Dialog open={successDialogOpen} onOpenChange={setSuccessDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>分享成功！</DialogTitle>
            <DialogDescription>
              您的涂色作品已成功分享到 Pinterest
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-4">
            <a
              href={pinUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm font-medium text-red-600 hover:text-red-700 transition-colors"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.162-.105-.949-.199-2.403.041-3.439.219-.937 1.406-5.957 1.406-5.957s-.359-.72-.359-1.781c0-1.663.967-2.911 2.168-2.911 1.024 0 1.518.769 1.518 1.688 0 1.029-.653 2.567-.992 3.992-.285 1.193.6 2.165 1.775 2.165 2.128 0 3.768-2.245 3.768-5.487 0-2.861-2.063-4.869-5.008-4.869-3.41 0-5.409 2.562-5.409 5.199 0 1.033.394 2.143.889 2.741.099.12.112.225.085.345-.09.375-.293 1.199-.334 1.363-.053.225-.172.271-.401.165-1.495-.69-2.433-2.878-2.433-4.646 0-3.776 2.748-7.252 7.92-7.252 4.158 0 7.392 2.967 7.392 6.923 0 4.135-2.607 7.462-6.233 7.462-1.214 0-2.354-.629-2.758-1.379l-.749 2.848c-.269 1.045-1.004 2.352-1.498 3.146 1.123.345 2.306.535 3.55.535 6.607 0 11.985-5.365 11.985-11.987C23.97 5.39 18.592.026 11.985.026L12.017 0z" />
              </svg>
              点击 Pinterest 查看
              <ExternalLink className="h-4 w-4" />
            </a>
          </div>
          <DialogFooter>
            <Button onClick={handleCloseDialog}>关闭</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
});

