import SwiftUI

@main
struct BlokApp: App {
    var body: some Scene {
        WindowGroup {
            RootView()
        }
    }
}

struct RootView: View {
    @StateObject private var model = BlokModel()

    var body: some View {
        Group {
            if model.settings.onboardingDone {
                HomeView()
            } else {
                OnboardingView()
            }
        }
        .environmentObject(model)
        .preferredColorScheme(.light)
        .tint(BlokColor.blue)
    }
}
