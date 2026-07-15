import Capacitor
import Network
import UIKit
import WebKit

@objc(NexusBridgePlugin)
public class NexusBridgePlugin: CAPPlugin {
  private struct TabInfo {
    let id: String
    let webView: WKWebView
    let incognito: Bool
  }

  private var tabs: [TabInfo] = []
  private var activeTabId = ""
  private weak var capacitorWebView: WKWebView?

  private let proxyDefaults = UserDefaults.standard
  private let proxyEnabledKey = "nexus.proxy.enabled.v2"
  private let proxyHostKey = "nexus.proxy.host"
  private let proxyPortKey = "nexus.proxy.port"
  private let proxyUsernameKey = "nexus.proxy.username"
  private let proxyPasswordKey = "nexus.proxy.password"

  private var activeTab: TabInfo? { tabs.first { $0.id == activeTabId } }

  @objc func createWebView(_ call: CAPPluginCall) {
    DispatchQueue.main.async {
      guard let shell = self.bridge?.webView else { call.reject("No bridge WebView"); return }
      self.capacitorWebView = shell
      if self.tabs.isEmpty { _ = self.addTab(url: nil, incognito: false) }
      self.notifyState()
      call.resolve(["created": true])
    }
  }

  @objc func createTab(_ call: CAPPluginCall) {
    DispatchQueue.main.async {
      let tab = self.addTab(url: call.getString("url"), incognito: call.getBool("incognito") ?? false)
      self.notifyState()
      call.resolve(["id": tab.id])
    }
  }

  @objc func switchTab(_ call: CAPPluginCall) {
    guard let id = call.getString("id") else { call.reject("Missing tab id"); return }
    DispatchQueue.main.async {
      guard self.tabs.contains(where: { $0.id == id }) else { call.reject("Tab not found"); return }
      self.activeTabId = id
      self.updateVisibility(showBrowser: true)
      self.notifyState()
      call.resolve()
    }
  }

  @objc func closeTab(_ call: CAPPluginCall) {
    guard let id = call.getString("id") else { call.reject("Missing tab id"); return }
    DispatchQueue.main.async {
      guard let index = self.tabs.firstIndex(where: { $0.id == id }) else { call.resolve(); return }
      self.tabs[index].webView.stopLoading()
      self.tabs[index].webView.removeFromSuperview()
      self.tabs.remove(at: index)
      if self.tabs.isEmpty { _ = self.addTab(url: nil, incognito: false); self.updateVisibility(showBrowser: false) }
      else if self.activeTabId == id { self.activeTabId = self.tabs[min(index, self.tabs.count - 1)].id; self.updateVisibility(showBrowser: true) }
      self.notifyState()
      call.resolve()
    }
  }

  @objc func listTabs(_ call: CAPPluginCall) {
    DispatchQueue.main.async { call.resolve(self.tabPayload()) }
  }

  @objc func navigate(_ call: CAPPluginCall) {
    guard let value = call.getString("url"), let url = URL(string: value) else { call.reject("Invalid URL"); return }
    DispatchQueue.main.async {
      if self.tabs.isEmpty { _ = self.addTab(url: nil, incognito: false) }
      self.updateVisibility(showBrowser: true)
      self.activeTab?.webView.load(URLRequest(url: url))
      self.notifyState()
      call.resolve()
    }
  }

  @objc func goBack(_ call: CAPPluginCall) { DispatchQueue.main.async { self.activeTab?.webView.goBack(); call.resolve() } }
  @objc func goForward(_ call: CAPPluginCall) { DispatchQueue.main.async { self.activeTab?.webView.goForward(); call.resolve() } }
  @objc func refresh(_ call: CAPPluginCall) { DispatchQueue.main.async { self.activeTab?.webView.reload(); call.resolve() } }
  @objc func showWebView(_ call: CAPPluginCall) { DispatchQueue.main.async { self.updateVisibility(showBrowser: true); call.resolve() } }
  @objc func hideWebView(_ call: CAPPluginCall) { DispatchQueue.main.async { self.updateVisibility(showBrowser: false); call.resolve() } }
  @objc func getState(_ call: CAPPluginCall) { DispatchQueue.main.async { call.resolve(self.statePayload()) } }

  @objc func getProxyStatus(_ call: CAPPluginCall) {
    call.resolve(proxyPayload())
  }

  @objc func setProxy(_ call: CAPPluginCall) {
    let enabled = call.getBool("enabled") ?? false
    let host = (call.getString("host") ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
    let port = call.getInt("port") ?? 8443
    let username = call.getString("username") ?? ""
    let password = call.getString("password") ?? ""

    if enabled && (host.isEmpty || !(1...65535).contains(port)) {
      call.reject("Enter a valid proxy host and port")
      return
    }
    if enabled, #unavailable(iOS 17.0) {
      call.reject("Nexus-only proxying requires iOS 17 or newer")
      return
    }

    proxyDefaults.set(enabled, forKey: proxyEnabledKey)
    proxyDefaults.set(host, forKey: proxyHostKey)
    proxyDefaults.set(port, forKey: proxyPortKey)
    proxyDefaults.set(username, forKey: proxyUsernameKey)
    if !password.isEmpty { proxyDefaults.set(password, forKey: proxyPasswordKey) }

    DispatchQueue.main.async {
      self.rebuildTabsForProxyChange()
      self.notifyState()
      call.resolve(self.proxyPayload())
    }
  }

  @objc func search(_ call: CAPPluginCall) {
    guard let query = call.getString("query")?.trimmingCharacters(in: .whitespacesAndNewlines), !query.isEmpty else {
      call.reject("Enter a search query"); return
    }
    let username = proxyDefaults.string(forKey: proxyUsernameKey) ?? ""
    let password = proxyDefaults.string(forKey: proxyPasswordKey) ?? ""
    guard !username.isEmpty, !password.isEmpty else {
      call.reject("Enter your Nexus VPS username and password in Settings first"); return
    }
    let safeSearch = call.getString("safeSearch") ?? "blur"
    let safeValue = safeSearch == "filter" ? "2" : safeSearch == "off" ? "0" : "1"
    var components = URLComponents(string: "https://80-190-72-122.sslip.io/search")!
    components.queryItems = [URLQueryItem(name: "q", value: query), URLQueryItem(name: "format", value: "json"), URLQueryItem(name: "categories", value: "general"), URLQueryItem(name: "safesearch", value: safeValue), URLQueryItem(name: "language", value: "en-US")]
    var request = URLRequest(url: components.url!)
    request.timeoutInterval = 25
    request.setValue("Basic \(Data("\(username):\(password)".utf8).base64EncodedString())", forHTTPHeaderField: "Authorization")
    request.setValue("application/json", forHTTPHeaderField: "Accept")
    let configuration = URLSessionConfiguration.ephemeral
    configuration.urlCache = nil
    configuration.requestCachePolicy = .reloadIgnoringLocalCacheData
    URLSession(configuration: configuration).dataTask(with: request) { data, response, error in
      if let error = error { call.reject("Private search failed: \(error.localizedDescription)"); return }
      guard let http = response as? HTTPURLResponse, http.statusCode == 200, let data = data else {
        call.reject("Private search rejected the request. Check your VPS credentials."); return
      }
      do {
        let payload = try JSONSerialization.jsonObject(with: data) as? [String: Any]
        let raw = payload?["results"] as? [[String: Any]] ?? []
        let results: [[String: Any]] = raw.prefix(call.getInt("count") ?? 30).compactMap { item in
          guard let title = item["title"] as? String, let url = item["url"] as? String else { return nil }
          return ["title": title, "url": url, "snippet": item["content"] as? String ?? "", "source": item["engine"] as? String ?? "web"]
        }
        call.resolve(["results": results])
      } catch { call.reject("SearXNG returned an invalid response") }
    }.resume()
  }

  private func addTab(url: String?, incognito: Bool) -> TabInfo {
    let configuration = WKWebViewConfiguration()
    configuration.allowsInlineMediaPlayback = true
    configuration.mediaTypesRequiringUserActionForPlayback = []
    configuration.defaultWebpagePreferences.preferredContentMode = .mobile
    let dataStore = incognito ? WKWebsiteDataStore.nonPersistent() : WKWebsiteDataStore.default()
    configureProxy(on: dataStore)
    configuration.websiteDataStore = dataStore

    let webView = WKWebView(frame: .zero, configuration: configuration)
    webView.navigationDelegate = self
    webView.uiDelegate = self
    webView.allowsBackForwardNavigationGestures = true
    webView.scrollView.contentInsetAdjustmentBehavior = .never
    webView.isHidden = true
    attach(webView)

    let tab = TabInfo(id: UUID().uuidString, webView: webView, incognito: incognito)
    tabs.append(tab)
    activeTabId = tab.id
    if let value = url, let destination = URL(string: value) {
      updateVisibility(showBrowser: true)
      webView.load(URLRequest(url: destination))
    }
    return tab
  }

  private func configureProxy(on dataStore: WKWebsiteDataStore) {
    guard proxyDefaults.bool(forKey: proxyEnabledKey) else { return }
    guard #available(iOS 17.0, *) else { return }
    let host = proxyDefaults.string(forKey: proxyHostKey) ?? ""
    let rawPort = proxyDefaults.integer(forKey: proxyPortKey)
    guard !host.isEmpty, let port = NWEndpoint.Port(rawValue: UInt16(rawPort)) else { return }

    let endpoint = NWEndpoint.hostPort(host: NWEndpoint.Host(host), port: port)
    var proxy = ProxyConfiguration(httpCONNECTProxy: endpoint, tlsOptions: NWProtocolTLS.Options())
    let username = proxyDefaults.string(forKey: proxyUsernameKey) ?? ""
    let password = proxyDefaults.string(forKey: proxyPasswordKey) ?? ""
    if !username.isEmpty { proxy.applyCredential(username: username, password: password) }
    proxy.allowFailover = false
    dataStore.proxyConfigurations = [proxy]
  }

  private func rebuildTabsForProxyChange() {
    let snapshots = tabs.map { tab in
      (id: tab.id, url: tab.webView.url?.absoluteString, incognito: tab.incognito, active: tab.id == activeTabId)
    }
    for tab in tabs { tab.webView.stopLoading(); tab.webView.removeFromSuperview() }
    tabs.removeAll()
    activeTabId = ""
    for snapshot in snapshots {
      let replacement = addTab(url: snapshot.url, incognito: snapshot.incognito)
      if snapshot.active { activeTabId = replacement.id }
    }
    if tabs.isEmpty { _ = addTab(url: nil, incognito: false) }
    updateVisibility(showBrowser: snapshots.contains(where: { $0.active && $0.url != nil }))
  }

  private func proxyPayload() -> [String: Any] {
    var supported = false
    if #available(iOS 17.0, *) { supported = true }
    return [
      "supported": supported,
      "enabled": proxyDefaults.bool(forKey: proxyEnabledKey),
      "host": proxyDefaults.string(forKey: proxyHostKey) ?? "80-190-72-122.sslip.io",
      "port": proxyDefaults.integer(forKey: proxyPortKey) == 0 ? 8443 : proxyDefaults.integer(forKey: proxyPortKey),
      "username": proxyDefaults.string(forKey: proxyUsernameKey) ?? "",
      "configured": !(proxyDefaults.string(forKey: proxyHostKey) ?? "").isEmpty
    ]
  }

  private func attach(_ webView: WKWebView, attempt: Int = 0) {
    if webView.superview != nil { return }
    guard let shell = capacitorWebView, let parent = shell.superview else {
      if attempt < 40 {
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.05) { [weak self, weak webView] in
          guard let self = self, let webView = webView else { return }
          self.attach(webView, attempt: attempt + 1)
        }
      }
      return
    }
    parent.insertSubview(webView, aboveSubview: shell)
    webView.translatesAutoresizingMaskIntoConstraints = false
    NSLayoutConstraint.activate([
      webView.topAnchor.constraint(equalTo: parent.safeAreaLayoutGuide.topAnchor, constant: 54),
      webView.bottomAnchor.constraint(equalTo: parent.safeAreaLayoutGuide.bottomAnchor, constant: -58),
      webView.leadingAnchor.constraint(equalTo: parent.leadingAnchor),
      webView.trailingAnchor.constraint(equalTo: parent.trailingAnchor),
    ])
  }

  private func updateVisibility(showBrowser: Bool) {
    capacitorWebView?.isHidden = false
    for tab in tabs { tab.webView.isHidden = !showBrowser || tab.id != activeTabId }
  }

  private func statePayload() -> [String: Any] {
    let webView = activeTab?.webView
    return [
      "tabId": activeTabId,
      "url": webView?.url?.absoluteString ?? "",
      "title": webView?.title ?? "",
      "isLoading": webView?.isLoading ?? false,
      "canGoBack": webView?.canGoBack ?? false,
      "canGoForward": webView?.canGoForward ?? false,
      "tabs": tabPayload()["tabs"] ?? [],
    ]
  }

  private func tabPayload() -> [String: Any] {
    let values: [[String: Any]] = tabs.map { tab in
      ["id": tab.id, "title": tab.webView.title ?? "New Tab", "url": tab.webView.url?.absoluteString ?? "", "incognito": tab.incognito]
    }
    return ["tabs": values, "activeTabId": activeTabId]
  }

  private func notifyState() {
    guard let data = try? JSONSerialization.data(withJSONObject: statePayload()),
          let json = String(data: data, encoding: .utf8) else { return }
    bridge?.triggerWindowJSEvent(eventName: "nexus:browserState", data: json)
  }
}

extension NexusBridgePlugin: WKNavigationDelegate {
  public func webView(_ webView: WKWebView, didStartProvisionalNavigation navigation: WKNavigation!) { if webView == activeTab?.webView { notifyState() } }
  public func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) { notifyState() }
  public func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) { showNavigationError(error, in: webView) }
  public func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) { showNavigationError(error, in: webView) }

  private func showNavigationError(_ error: Error, in webView: WKWebView) {
    let nsError = error as NSError
    if nsError.code == NSURLErrorCancelled { notifyState(); return }
    let message = error.localizedDescription
      .replacingOccurrences(of: "&", with: "&amp;")
      .replacingOccurrences(of: "<", with: "&lt;")
      .replacingOccurrences(of: ">", with: "&gt;")
    let html = """
      <meta name="viewport" content="width=device-width,initial-scale=1">
      <style>body{font-family:-apple-system;background:#080d1b;color:#f5f7ff;padding:48px 24px}div{max-width:520px;margin:auto}h2{font-size:22px}p{color:#9aa6c2;line-height:1.5}button{border:0;border-radius:12px;padding:12px 18px;background:#ef4766;color:white;font-weight:600}</style>
      <div><h2>Page couldn’t load</h2><p>\(message)</p><button onclick="location.reload()">Try again</button></div>
      """
    webView.loadHTMLString(html, baseURL: nil)
    notifyState()
  }
}

extension NexusBridgePlugin: WKUIDelegate {
  public func webView(_ webView: WKWebView, createWebViewWith configuration: WKWebViewConfiguration,
                      for navigationAction: WKNavigationAction, windowFeatures: WKWindowFeatures) -> WKWebView? {
    if let url = navigationAction.request.url { _ = addTab(url: url.absoluteString, incognito: activeTab?.incognito ?? false); notifyState() }
    return nil
  }

  public func webView(_ webView: WKWebView, runJavaScriptAlertPanelWithMessage message: String,
                      initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping () -> Void) {
    let alert = UIAlertController(title: nil, message: message, preferredStyle: .alert)
    alert.addAction(UIAlertAction(title: "OK", style: .default) { _ in completionHandler() })
    bridge?.viewController?.present(alert, animated: true)
  }
}
