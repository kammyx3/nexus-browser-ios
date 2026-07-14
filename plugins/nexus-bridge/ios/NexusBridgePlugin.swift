import Capacitor
import WebKit

@objc(NexusBridgePlugin)
public class NexusBridgePlugin: CAPPlugin {
  private var browserWebView: WKWebView?
  private var capacitorWebView: WKWebView?
  private var currentURL: String = ""
  private var currentTitle: String = ""
  private var isLoading: Bool = false
  private var canGoBack: Bool = false
  private var canGoForward: Bool = false

  // MARK: - WebView Management

  @objc func createWebView(_ call: CAPPluginCall) {
    DispatchQueue.main.async {
      guard let webView = self.bridge?.webView else {
        call.reject("No bridge WebView")
        return
      }
      self.capacitorWebView = webView

      let config = WKWebViewConfiguration()
      config.allowsInlineMediaPlayback = true
      config.mediaTypesRequiringUserActionForPlayback = []
      config.defaultWebpagePreferences.preferredContentMode = .mobile

      let browserWV = WKWebView(frame: .zero, configuration: config)
      browserWV.autoresizingMask = [.flexibleWidth, .flexibleHeight]
      browserWV.navigationDelegate = self
      browserWV.uiDelegate = self
      browserWV.allowsBackForwardNavigationGestures = true
      browserWV.scrollView.contentInsetAdjustmentBehavior = .never

      if let webViewParent = webView.superview {
        webViewParent.insertSubview(browserWV, aboveSubview: webView)
        browserWV.translatesAutoresizingMaskIntoConstraints = false
        NSLayoutConstraint.activate([
          browserWV.topAnchor.constraint(equalTo: webViewParent.topAnchor),
          browserWV.bottomAnchor.constraint(equalTo: webViewParent.bottomAnchor),
          browserWV.leadingAnchor.constraint(equalTo: webViewParent.leadingAnchor),
          browserWV.trailingAnchor.constraint(equalTo: webViewParent.trailingAnchor),
        ])
        browserWV.isHidden = true
      }

      self.browserWebView = browserWV
      call.resolve(["created": true])
    }
  }

  @objc func navigate(_ call: CAPPluginCall) {
    guard let urlStr = call.getString("url"), let url = URL(string: urlStr) else {
      call.reject("Invalid URL")
      return
    }
    DispatchQueue.main.async {
      self.capacitorWebView?.isHidden = true
      self.browserWebView?.isHidden = false
      self.browserWebView?.load(URLRequest(url: url))
      self.notifyState()
      call.resolve()
    }
  }

  @objc func goBack(_ call: CAPPluginCall) {
    DispatchQueue.main.async {
      self.browserWebView?.goBack()
      call.resolve()
    }
  }

  @objc func goForward(_ call: CAPPluginCall) {
    DispatchQueue.main.async {
      self.browserWebView?.goForward()
      call.resolve()
    }
  }

  @objc func refresh(_ call: CAPPluginCall) {
    DispatchQueue.main.async {
      self.browserWebView?.reload()
      call.resolve()
    }
  }

  @objc func showWebView(_ call: CAPPluginCall) {
    DispatchQueue.main.async {
      self.capacitorWebView?.isHidden = true
      self.browserWebView?.isHidden = false
      call.resolve()
    }
  }

  @objc func hideWebView(_ call: CAPPluginCall) {
    DispatchQueue.main.async {
      self.browserWebView?.isHidden = true
      self.capacitorWebView?.isHidden = false
      call.resolve()
    }
  }

  @objc func getState(_ call: CAPPluginCall) {
    call.resolve([
      "url": self.currentURL,
      "title": self.currentTitle,
      "isLoading": self.isLoading,
      "canGoBack": self.canGoBack,
      "canGoForward": self.canGoForward,
    ] as [String: Any])
  }

  // MARK: - Helpers

  private func notifyState() {
    self.bridge?.triggerWindowJSEvent(eventName: "nexus:browserState", data: [
      "url": self.currentURL,
      "title": self.currentTitle,
      "isLoading": self.isLoading,
      "canGoBack": self.canGoBack,
      "canGoForward": self.canGoForward,
    ])
  }
}

// MARK: - WKNavigationDelegate

extension NexusBridgePlugin: WKNavigationDelegate {
  public func webView(_ webView: WKWebView, didStartProvisionalNavigation navigation: WKNavigation!) {
    isLoading = true
    notifyState()
  }

  public func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
    isLoading = false
    currentURL = webView.url?.absoluteString ?? ""
    currentTitle = webView.title ?? ""
    canGoBack = webView.canGoBack
    canGoForward = webView.canGoForward
    webView.evaluateJavaScript("document.title") { (title, _) in
      if let t = title as? String { self.currentTitle = t }
      self.notifyState()
    }
  }

  public func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
    isLoading = false
    notifyState()
  }

  public func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
    isLoading = false
    notifyState()
  }
}

// MARK: - WKUIDelegate

extension NexusBridgePlugin: WKUIDelegate {
  public func webView(_ webView: WKWebView, createWebViewWith configuration: WKWebViewConfiguration,
                      for navigationAction: WKNavigationAction, windowFeatures: WKWindowFeatures) -> WKWebView? {
    if let url = navigationAction.request.url {
      webView.load(URLRequest(url: url))
    }
    return nil
  }

  public func webView(_ webView: WKWebView, runJavaScriptAlertPanelWithMessage message: String,
                      initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping () -> Void) {
    let alert = UIAlertController(title: nil, message: message, preferredStyle: .alert)
    alert.addAction(UIAlertAction(title: "OK", style: .default) { _ in completionHandler() })
    self.bridge?.viewController?.present(alert, animated: true)
  }
}
