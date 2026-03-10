require 'json'

package = JSON.parse(File.read(File.join(__dir__, '..', 'package.json')))

Pod::Spec.new do |s|
  s.name           = 'AudioRoute'
  s.version        = package['version']
  s.summary        = 'iOS AVAudioSession route management module'
  s.description    = 'Expo native module for querying and setting iOS audio input/output routes'
  s.license        = { :type => 'MIT' }
  s.author         = 'autopl'
  s.homepage       = 'https://github.com/shogonakamura1/autopl'
  s.platforms      = { :ios => '15.1' }
  s.swift_version  = '5.9'
  s.source         = { :git => '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
    'SWIFT_COMPILATION_MODE' => 'wholemodule'
  }

  s.source_files = '*.swift'
end
