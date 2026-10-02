import Capacitor

/* Registers the in-app browser and Blok plugin. The phone UI never uses
   SFSafariViewController, which cannot run content rules or page scripts. */
class ErdosBridgeViewController: CAPBridgeViewController {
    override open func capacitorDidLoad() {
        bridge?.registerPluginInstance(ErdosNativePlugin())
    }
}
