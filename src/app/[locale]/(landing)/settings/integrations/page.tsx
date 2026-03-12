import { getTranslations } from 'next-intl/server';

import { Empty } from '@/shared/blocks/common';
import { getUserInfo } from '@/shared/models/user';
import { PinterestBindButton } from '@/shared/blocks/pinterest/pinterest-bind-button';

export default async function IntegrationsPage() {
  const user = await getUserInfo();
  if (!user) {
    return <Empty message="Please login to view integrations" />;
  }

  const t = await getTranslations('settings.integrations');

  return (
    <div className="space-y-8">
      {/* Pinterest Integration */}
      <div className="border rounded-lg p-6 space-y-4">
        <div className="flex items-center gap-3">
          <svg
            className="w-8 h-8"
            viewBox="0 0 24 24"
            fill="#E60023"
          >
            <path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.162-.105-.949-.199-2.403.041-3.439.219-.937 1.406-5.957 1.406-5.957s-.359-.72-.359-1.781c0-1.663.967-2.911 2.168-2.911 1.024 0 1.518.769 1.518 1.688 0 1.029-.653 2.567-.992 3.992-.285 1.193.6 2.165 1.775 2.165 2.128 0 3.768-2.245 3.768-5.487 0-2.861-2.063-4.869-5.008-4.869-3.41 0-5.409 2.562-5.409 5.199 0 1.033.394 2.143.889 2.741.099.12.112.225.085.345-.09.375-.293 1.199-.334 1.363-.053.225-.172.271-.401.165-1.495-.69-2.433-2.878-2.433-4.646 0-3.776 2.748-7.252 7.92-7.252 4.158 0 7.392 2.967 7.392 6.923 0 4.135-2.607 7.462-6.233 7.462-1.214 0-2.354-.629-2.758-1.379l-.749 2.848c-.269 1.045-1.004 2.352-1.498 3.146 1.123.345 2.306.535 3.55.535 6.607 0 11.985-5.365 11.985-11.987C23.97 5.39 18.592.026 11.985.026L12.017 0z" />
          </svg>
          <div>
            <h2 className="text-xl font-semibold">Pinterest Integration</h2>
            <p className="text-sm text-muted-foreground">
              Connect your Pinterest account to share coloring pages directly
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <PinterestBindButton />
        </div>

        <div className="text-sm text-muted-foreground space-y-2 pt-2 border-t">
          <p>
            <strong>Benefits of connecting:</strong>
          </p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>Share coloring pages directly to your Pinterest boards</li>
            <li>Save time with one-click sharing</li>
            <li>Build your Pinterest presence automatically</li>
          </ul>
        </div>
      </div>

      {/* Coming Soon - Other Integrations */}
      <div className="border rounded-lg p-6 space-y-4 opacity-60">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-sm font-bold">
            IG
          </div>
          <div>
            <h2 className="text-xl font-semibold">Instagram</h2>
            <p className="text-sm text-muted-foreground">Coming soon</p>
          </div>
        </div>
      </div>

      <div className="border rounded-lg p-6 space-y-4 opacity-60">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-black flex items-center justify-center text-white text-sm font-bold">
            X
          </div>
          <div>
            <h2 className="text-xl font-semibold">X (Twitter)</h2>
            <p className="text-sm text-muted-foreground">Coming soon</p>
          </div>
        </div>
      </div>
    </div>
  );
}
