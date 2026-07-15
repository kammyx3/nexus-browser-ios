Pod::Spec.new do |spec|
  spec.name = 'NexusBridge'
  spec.version = '1.0.0'
  spec.summary = 'Native multi-tab WKWebView bridge for Nexus Browser.'
  spec.license = { :type => 'MIT' }
  spec.homepage = 'https://github.com/'
  spec.author = { 'Nexus' => 'nexus@localhost' }
  spec.source = { :path => '.' }
  spec.source_files = 'ios/**/*.{swift,h,m,mm}'
  spec.ios.deployment_target = '15.0'
  spec.dependency 'Capacitor'
  spec.swift_version = '5.9'
end
