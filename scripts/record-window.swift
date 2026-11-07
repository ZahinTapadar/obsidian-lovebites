// Records a single app window (nothing layered over it) to an .mp4 with ScreenCaptureKit.
// build: swiftc -O -parse-as-library scripts/record-window.swift -o record-window
// usage: ./record-window <out.mp4> <seconds> <bundle id> <title substring>
import Foundation
import AppKit
import ScreenCaptureKit
import CoreMedia

final class Failure: NSObject, SCRecordingOutputDelegate {
	func recordingOutput(_ out: SCRecordingOutput, didFailWithError error: Error) {
		FileHandle.standardError.write("record failed: \(error)\n".data(using: .utf8)!)
		exit(1)
	}
}

@main
struct RecordWindow {
	static func main() async throws {
		_ = NSApplication.shared // a command-line tool needs a window-server connection before ScreenCaptureKit works
		let a = CommandLine.arguments
		guard a.count == 5, let secs = Double(a[2]) else { print("usage: <out.mp4> <seconds> <bundle id> <title substring>"); exit(2) }
		let content = try await SCShareableContent.excludingDesktopWindows(false, onScreenWindowsOnly: true)
		guard let win = content.windows.first(where: { $0.owningApplication?.bundleIdentifier == a[3] && ($0.title ?? "").contains(a[4]) }) else {
			print("window not found"); exit(3)
		}
		let cfg = SCStreamConfiguration()
		cfg.width = Int(win.frame.width * 2)
		cfg.height = Int(win.frame.height * 2)
		cfg.minimumFrameInterval = CMTime(value: 1, timescale: 60)
		cfg.showsCursor = false
		let stream = SCStream(filter: SCContentFilter(desktopIndependentWindow: win), configuration: cfg, delegate: nil)
		let rc = SCRecordingOutputConfiguration()
		rc.outputURL = URL(fileURLWithPath: a[1])
		rc.outputFileType = .mp4
		let failure = Failure()
		try stream.addRecordingOutput(SCRecordingOutput(configuration: rc, delegate: failure))
		try await stream.startCapture()
		print("recording \(win.title ?? "") for \(secs)s")
		try await Task.sleep(for: .seconds(secs))
		try await stream.stopCapture()
		print("saved \(a[1])")
	}
}
