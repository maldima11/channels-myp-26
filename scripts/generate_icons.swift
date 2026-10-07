import Foundation
import AppKit

func renderSvgToPng(svgPath: String, outPath: String, targetSize: Int, rounded: Bool = false) {
    guard let svgData = try? Data(contentsOf: URL(fileURLWithPath: svgPath)),
          let svgImage = NSImage(data: svgData) else {
        print("Failed to load SVG: \(svgPath)")
        return
    }

    let size = NSSize(width: targetSize, height: targetSize)
    let rep = NSBitmapImageRep(
        bitmapDataPlanes: nil,
        pixelsWide: targetSize,
        pixelsHigh: targetSize,
        bitsPerSample: 8,
        samplesPerPixel: 4,
        hasAlpha: true,
        isPlanar: false,
        colorSpaceName: .calibratedRGB,
        bytesPerRow: 0,
        bitsPerPixel: 0
    )!

    NSGraphicsContext.saveGraphicsState()
    let context = NSGraphicsContext(bitmapImageRep: rep)
    NSGraphicsContext.current = context

    context?.imageInterpolation = .high

    if rounded {
        let clipPath = NSBezierPath(ovalIn: NSRect(x: 0, y: 0, width: targetSize, height: targetSize))
        clipPath.addClip()
    }

    svgImage.draw(in: NSRect(x: 0, y: 0, width: targetSize, height: targetSize),
                  from: .zero,
                  operation: .copy,
                  fraction: 1.0)

    NSGraphicsContext.restoreGraphicsState()

    if let pngData = rep.representation(using: .png, properties: [:]) {
        let outUrl = URL(fileURLWithPath: outPath)
        try? FileManager.default.createDirectory(at: outUrl.deletingLastPathComponent(), withIntermediateDirectories: true)
        try? pngData.write(to: outUrl)
        print("Generated: \(outPath) (\(targetSize)x\(targetSize)\(rounded ? " round" : ""))")
    }
}

let basePath = FileManager.default.currentDirectoryPath
let svgPath = "\(basePath)/web/static/logo.svg"

// 1. Web Portal Assets
renderSvgToPng(svgPath: svgPath, outPath: "\(basePath)/web/static/logo-512.png", targetSize: 512)
renderSvgToPng(svgPath: svgPath, outPath: "\(basePath)/web/static/logo-192.png", targetSize: 192)
renderSvgToPng(svgPath: svgPath, outPath: "\(basePath)/web/static/favicon.png", targetSize: 64)
renderSvgToPng(svgPath: svgPath, outPath: "\(basePath)/api/static/logo-512.png", targetSize: 512)

// 2. Android Mipmap Icons
let mipmaps: [(name: String, size: Int)] = [
    ("mipmap-mdpi", 48),
    ("mipmap-hdpi", 72),
    ("mipmap-xhdpi", 96),
    ("mipmap-xxhdpi", 144),
    ("mipmap-xxxhdpi", 192)
]

for m in mipmaps {
    let dir = "\(basePath)/mobile/android/app/src/main/res/\(m.name)"
    renderSvgToPng(svgPath: svgPath, outPath: "\(dir)/ic_launcher.png", targetSize: m.size, rounded: false)
    renderSvgToPng(svgPath: svgPath, outPath: "\(dir)/ic_launcher_round.png", targetSize: m.size, rounded: true)
}

// 3. iOS Icons
let iosDir = "\(basePath)/mobile/ios/NustYieldMobile/Images.xcassets/AppIcon.appiconset"
renderSvgToPng(svgPath: svgPath, outPath: "\(iosDir)/icon-1024.png", targetSize: 1024)
renderSvgToPng(svgPath: svgPath, outPath: "\(iosDir)/icon-180.png", targetSize: 180)
renderSvgToPng(svgPath: svgPath, outPath: "\(iosDir)/icon-120.png", targetSize: 120)
print("All app icons successfully rendered!")
