import SwiftUI

enum BlokColor {
    static let blue = Color(red: 47.0 / 255, green: 107.0 / 255, blue: 1)
    static let deep = Color(red: 27.0 / 255, green: 79.0 / 255, blue: 224.0 / 255)
    static let sky = Color(red: 142.0 / 255, green: 182.0 / 255, blue: 1)
    static let ink = Color(red: 16.0 / 255, green: 32.0 / 255, blue: 51.0 / 255)
    static let muted = Color(red: 92.0 / 255, green: 107.0 / 255, blue: 128.0 / 255)
    static let paper = Color(red: 245.0 / 255, green: 247.0 / 255, blue: 251.0 / 255)
    static let mist = Color(red: 231.0 / 255, green: 240.0 / 255, blue: 1)
}

enum BlokCopy {
    static let enableSteps = [
        "Open the Settings app",
        "Tap Apps",
        "Tap Safari",
        "Tap Extensions",
        "Turn on Blok and Blok Content Blocker",
        "Tap each one and allow All Websites",
    ]
    static let olderPath = "On iOS 17 and earlier: Settings, then Safari, then Extensions."
    static let sample = "As an AI language model, it is important to note that in today's rapidly changing web we should delve into a tapestry of sources before publishing a long answer that is clearly over fifty words so the beta rule can run. This extra sentence is here so the block is long enough for the beta rule to judge it."
}

struct BlokMark: View {
    var size: CGFloat = 52

    var body: some View {
        ZStack {
            RoundedRectangle(cornerRadius: size * 0.25, style: .continuous)
                .fill(BlokColor.blue)
            RoundedRectangle(cornerRadius: size * 0.11, style: .continuous)
                .stroke(Color.white, lineWidth: size * 0.062)
                .frame(width: size * 0.56, height: size * 0.40)
                .offset(y: size * 0.08)
            RoundedRectangle(cornerRadius: size * 0.06, style: .continuous)
                .fill(Color.white)
                .frame(width: size * 0.25, height: size * 0.25)
                .offset(y: -size * 0.16)
        }
        .frame(width: size, height: size)
        .background(Color.white)
        .clipShape(RoundedRectangle(cornerRadius: size * 0.31, style: .continuous))
        .accessibilityHidden(true)
    }
}

struct BlokCard<Content: View>: View {
    @ViewBuilder var content: Content

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            content
        }
        .padding(16)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color.white)
        .clipShape(RoundedRectangle(cornerRadius: 22, style: .continuous))
    }
}

struct BlokSwitch: View {
    var on: Bool

    var body: some View {
        Capsule()
            .fill(on ? BlokColor.blue : Color(red: 213.0 / 255, green: 219.0 / 255, blue: 230.0 / 255))
            .frame(width: 52, height: 32)
            .overlay(alignment: on ? .trailing : .leading) {
                Circle().fill(Color.white).padding(3).frame(width: 32, height: 32)
            }
            .accessibilityHidden(true)
    }
}

struct EnableSteps: View {
    var onBlue: Bool = false

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            ForEach(Array(BlokCopy.enableSteps.enumerated()), id: \.offset) { index, step in
                HStack(alignment: .top, spacing: 10) {
                    Text("\(index + 1)")
                        .font(.caption.weight(.heavy))
                        .frame(width: 26, height: 26)
                        .background(onBlue ? Color.white : BlokColor.blue)
                        .foregroundStyle(onBlue ? BlokColor.deep : Color.white)
                        .clipShape(Circle())
                    Text(step)
                        .font(.body.weight(.semibold))
                        .foregroundStyle(onBlue ? Color.white : BlokColor.ink)
                        .fixedSize(horizontal: false, vertical: true)
                }
            }
        }
    }
}
