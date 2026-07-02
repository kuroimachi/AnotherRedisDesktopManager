const { notarize } = require('@electron/notarize');

exports.default = async function notarizing(context) {
  const { electronPlatformName, appOutDir } = context;
  if (electronPlatformName !== 'darwin') {
    return;
  }

  // 本地打包通常不配置 Apple Developer 证书，仅在发布凭据完整时执行公证。
  if (!process.env.APPLEID || !process.env.APPLEID_PASSWORD) {
    console.log('Skip macOS notarization: APPLEID or APPLEID_PASSWORD is not configured.');
    return;
  }

  const appName = context.packager.appInfo.productFilename;

  return await notarize({
    appBundleId: 'me.qii404.another-redis-desktop-manager',
    appPath: `${appOutDir}/${appName}.app`,
    appleId: process.env.APPLEID,
    appleIdPassword: process.env.APPLEID_PASSWORD,
    teamId: '68JN8DV835',
  });
};
