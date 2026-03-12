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
 * Pinterest bind/unbind button component
 * Used for users to bind or unbind their Pinterest account
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

  // Bind Pinterest
  const handleBind = () => {
    setActionLoading(true);
    // Redirect to authorization page
    window.location.href = '/api/pinterest/authorize';
  };

  // Unbind Pinterest
  const handleUnbind = async () => {
    if (!confirm('Are you sure you want to unbind your Pinterest account?')) {
      return;
    }

    setActionLoading(true);
    try {
      const response = await fetch('/api/pinterest/status', {
        method: 'DELETE',
      });

      if (response.ok) {
        const data = await response.json();
        toast.success(data.message || 'Pinterest unbind successful');
        setStatus({ connected: false });
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to unbind');
      }
    } catch (error) {
      console.error('Failed to disconnect Pinterest:', error);
      toast.error('Failed to unbind, please try again');
    } finally {
      setActionLoading(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <Button variant={variant} size={size} className={className} disabled>
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Loading...
      </Button>
    );
  }

  // Not connected state - show bind button
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
        Connect Pinterest
      </Button>
    );
  }

  // Connected state - show connection info and unbind button
  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1 text-sm text-muted-foreground">
        <Check className="h-4 w-4 text-green-500" />
        <span>Connected</span>
        {status.tokenExpired && (
          <span className="text-amber-500">(Token expired)</span>
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
 * Simple share to Pinterest button
 * Used to share content to Pinterest
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
      toast.error('Please bind your Pinterest account first');
      return;
    }

    if (status.tokenExpired) {
      toast.error('Pinterest Token has expired, please rebind');
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
        toast.error(error.error || 'Share failed');
      }
    } catch (error) {
      console.error('Failed to share to Pinterest:', error);
      toast.error('Share failed, please try again');
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
        Share to Pinterest
      </Button>
    );
  }

  // Not connected state - show button to redirect to settings page
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
        Connect Pinterest
      </Button>
    );
  }

  // Token expired state
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
        Reconnect Pinterest
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
        {sharing ? 'Sharing...' : 'Share to Pinterest'}
      </Button>

      <Dialog open={successDialogOpen} onOpenChange={setSuccessDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Share Successful!</DialogTitle>
            <DialogDescription>
              Your coloring page has been successfully shared to Pinterest
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
              View on Pinterest
              <ExternalLink className="h-4 w-4" />
            </a>
          </div>
          <DialogFooter>
            <Button onClick={handleCloseDialog}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
});

