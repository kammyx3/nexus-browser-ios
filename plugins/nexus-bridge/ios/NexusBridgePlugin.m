#import <Capacitor/Capacitor.h>

CAP_PLUGIN(NexusBridgePlugin, "NexusBridge",
  CAP_PLUGIN_METHOD(createWebView, CAPPluginReturnPromise);
  CAP_PLUGIN_METHOD(createTab, CAPPluginReturnPromise);
  CAP_PLUGIN_METHOD(switchTab, CAPPluginReturnPromise);
  CAP_PLUGIN_METHOD(closeTab, CAPPluginReturnPromise);
  CAP_PLUGIN_METHOD(listTabs, CAPPluginReturnPromise);
  CAP_PLUGIN_METHOD(navigate, CAPPluginReturnPromise);
  CAP_PLUGIN_METHOD(goBack, CAPPluginReturnPromise);
  CAP_PLUGIN_METHOD(goForward, CAPPluginReturnPromise);
  CAP_PLUGIN_METHOD(refresh, CAPPluginReturnPromise);
  CAP_PLUGIN_METHOD(showWebView, CAPPluginReturnPromise);
  CAP_PLUGIN_METHOD(hideWebView, CAPPluginReturnPromise);
  CAP_PLUGIN_METHOD(getState, CAPPluginReturnPromise);
  CAP_PLUGIN_METHOD(getProxyStatus, CAPPluginReturnPromise);
  CAP_PLUGIN_METHOD(setProxy, CAPPluginReturnPromise);
  CAP_PLUGIN_METHOD(search, CAPPluginReturnPromise);
)
