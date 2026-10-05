"""Write safari/Blok.xcodeproj. Run from anywhere: python3 safari/tools/generate_xcodeproj.py"""
import hashlib
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PROJECT = ROOT / "Blok.xcodeproj"


def oid(name: str) -> str:
    return hashlib.sha1(name.encode()).hexdigest()[:24].upper()


def q(value: str) -> str:
    if value == "":
        return '""'
    if any(ch in value for ch in ' /<>()+$@'):
        return '"' + value.replace("\\", "\\\\").replace('"', '\\"') + '"'
    return value


def settings_block(pairs, indent=3):
    pad = "\t" * indent
    lines = [f"{pad}buildSettings = {{"]
    for key, value in pairs:
        if isinstance(value, list):
            lines.append(f"{pad}\t{key} = (")
            for item in value:
                lines.append(f"{pad}\t\t{q(item)},")
            lines.append(f"{pad}\t);")
        else:
            lines.append(f"{pad}\t{key} = {q(str(value))};")
    lines.append(f"{pad}}};")
    return "\n".join(lines)


APP = "Blok"
EXT = "BlokExtension"
BLOCKER = "BlokContentBlocker"

# file ref name, path relative to SOURCE_ROOT (safari/), kind, group
# kind: swift, resource, folder, asset, plist, entitlements, js, json, html, css, privacy
FILES = [
    ("BlokApp.swift", "App/BlokApp.swift", "swift", "app"),
    ("BlokTheme.swift", "App/BlokTheme.swift", "swift", "app"),
    ("BlokModel.swift", "App/BlokModel.swift", "swift", "app"),
    ("OnboardingView.swift", "App/OnboardingView.swift", "swift", "app"),
    ("HomeView.swift", "App/HomeView.swift", "swift", "app"),
    ("SitesView.swift", "App/SitesView.swift", "swift", "app"),
    ("SettingsView.swift", "App/SettingsView.swift", "swift", "app"),
    ("AppInfo.plist", "App/Info.plist", "plist", "app"),
    ("Blok.entitlements", "App/Blok.entitlements", "entitlements", "app"),
    ("Assets.xcassets", "App/Assets.xcassets", "asset", "app"),
    ("SafariWebExtensionHandler.swift", "Extension/SafariWebExtensionHandler.swift", "swift", "ext"),
    ("ExtInfo.plist", "Extension/Info.plist", "plist", "ext"),
    ("Extension.entitlements", "Extension/Extension.entitlements", "entitlements", "ext"),
    ("manifest.json", "Extension/Resources/manifest.json", "json", "extres"),
    ("background.js", "Extension/Resources/background.js", "js", "extres"),
    ("popup.html", "Extension/Resources/popup.html", "html", "extres"),
    ("popup.css", "Extension/Resources/popup.css", "css", "extres"),
    ("popup.js", "Extension/Resources/popup.js", "js", "extres"),
    ("images", "Extension/Resources/images", "folder", "extres"),
    ("ContentBlockerRequestHandler.swift", "ContentBlocker/ContentBlockerRequestHandler.swift", "swift", "blocker"),
    ("BlockerInfo.plist", "ContentBlocker/Info.plist", "plist", "blocker"),
    ("ContentBlocker.entitlements", "ContentBlocker/ContentBlocker.entitlements", "entitlements", "blocker"),
    ("blockerList.json", "ContentBlocker/blockerList.json", "json", "blocker"),
    ("BlokAppGroup.swift", "Shared/BlokAppGroup.swift", "swift", "shared"),
    ("BlokModels.swift", "Shared/BlokModels.swift", "swift", "shared"),
    ("BlokEngine.swift", "Shared/BlokEngine.swift", "swift", "shared"),
    ("BlockerReload.swift", "Shared/BlockerReload.swift", "swift", "shared"),
    ("PrivacyInfo.xcprivacy", "Shared/PrivacyInfo.xcprivacy", "privacy", "shared"),
    ("blok-logic.js", "../blok/blok-logic.js", "js", "web"),
    ("page-script.js", "../blok/page-script.js", "js", "web"),
    ("rules.json", "../blok/rules.json", "json", "web"),
]

FILE_TYPES = {
    "swift": "sourcecode.swift",
    "plist": "text.plist.xml",
    "entitlements": "text.plist.entitlements",
    "asset": "folder.assetcatalog",
    "json": "text.json",
    "js": "sourcecode.javascript",
    "html": "text.html",
    "css": "text.css",
    "privacy": "text.xml",
    "folder": "folder",
}

# Which targets compile or copy each file. Entitlements and Info.plists are not copied.
MEMBERSHIP = {
    "BlokApp.swift": [("app", "source")],
    "BlokTheme.swift": [("app", "source")],
    "BlokModel.swift": [("app", "source")],
    "OnboardingView.swift": [("app", "source")],
    "HomeView.swift": [("app", "source")],
    "SitesView.swift": [("app", "source")],
    "SettingsView.swift": [("app", "source")],
    "Assets.xcassets": [("app", "resource")],
    "SafariWebExtensionHandler.swift": [("ext", "source")],
    "manifest.json": [("ext", "resource")],
    "background.js": [("ext", "resource")],
    "popup.html": [("ext", "resource")],
    "popup.css": [("ext", "resource")],
    "popup.js": [("ext", "resource")],
    "images": [("ext", "resource")],
    "ContentBlockerRequestHandler.swift": [("blocker", "source")],
    "blockerList.json": [("blocker", "resource")],
    "BlokAppGroup.swift": [("app", "source"), ("ext", "source"), ("blocker", "source")],
    "BlokModels.swift": [("app", "source")],
    "BlokEngine.swift": [("app", "source"), ("ext", "source")],
    "BlockerReload.swift": [("app", "source"), ("ext", "source")],
    "PrivacyInfo.xcprivacy": [("app", "resource"), ("ext", "resource"), ("blocker", "resource")],
    "blok-logic.js": [("app", "resource"), ("ext", "resource")],
    "page-script.js": [("ext", "resource")],
    "rules.json": [("app", "resource"), ("ext", "resource")],
}

FRAMEWORKS = {
    "app": ["SafariServices.framework", "JavaScriptCore.framework"],
    "ext": ["SafariServices.framework", "JavaScriptCore.framework"],
    "blocker": [],
}


def main() -> None:
    file_ids = {item[0]: oid("file:" + item[0]) for item in FILES}
    build_ids = {}
    for name, members in MEMBERSHIP.items():
        for target, phase in members:
            build_ids[(name, target, phase)] = oid(f"build:{target}:{phase}:{name}")

    fw_ids = {name: oid("fw:" + name) for name in ["SafariServices.framework", "JavaScriptCore.framework"]}
    fw_build = {}
    for target, names in FRAMEWORKS.items():
        for name in names:
            fw_build[(target, name)] = oid(f"fwbuild:{target}:{name}")

    products = {
        "app": (oid("product:app"), "Blok.app", "wrapper.application"),
        "ext": (oid("product:ext"), "BlokExtension.appex", "wrapper.app-extension"),
        "blocker": (oid("product:blocker"), "BlokContentBlocker.appex", "wrapper.app-extension"),
    }
    embed = {
        "ext": oid("embed:ext"),
        "blocker": oid("embed:blocker"),
    }
    phases = {
        target: {
            "sources": oid(f"phase:{target}:sources"),
            "resources": oid(f"phase:{target}:resources"),
            "frameworks": oid(f"phase:{target}:frameworks"),
        }
        for target in ("app", "ext", "blocker")
    }
    phases["app"]["embed"] = oid("phase:app:embed")
    targets = {name: oid("target:" + name) for name in ("app", "ext", "blocker")}
    target_lists = {name: oid("list:target:" + name) for name in ("app", "ext", "blocker")}
    project_list = oid("list:project")
    configs = {}
    for scope in ("project", "app", "ext", "blocker"):
        for mode in ("Debug", "Release"):
            configs[(scope, mode)] = oid(f"config:{scope}:{mode}")
    proxies = {"ext": oid("proxy:ext"), "blocker": oid("proxy:blocker")}
    deps = {"ext": oid("dep:ext"), "blocker": oid("dep:blocker")}
    groups = {name: oid("group:" + name) for name in ("main", "app", "ext", "extres", "blocker", "shared", "web", "products", "frameworks")}
    project_id = oid("project")

    lines = []
    a = lines.append
    a("// !$*UTF8*$!")
    a("{")
    a("\tarchiveVersion = 1;")
    a("\tclasses = {")
    a("\t};")
    a("\tobjectVersion = 56;")
    a("\tobjects = {")
    a("")
    a("/* Begin PBXBuildFile section */")
    for (name, target, phase), build_id in sorted(build_ids.items(), key=lambda item: item[1]):
        a(f"\t\t{build_id} /* {name} in {target} */ = {{isa = PBXBuildFile; fileRef = {file_ids[name]} /* {name} */; }};")
    for (target, name), build_id in fw_build.items():
        a(f"\t\t{build_id} /* {name} in {target} */ = {{isa = PBXBuildFile; fileRef = {fw_ids[name]} /* {name} */; }};")
    for key, build_id in embed.items():
        product_id = products[key][0]
        product_name = products[key][1]
        a(f"\t\t{build_id} /* {product_name} in Embed */ = {{isa = PBXBuildFile; fileRef = {product_id} /* {product_name} */; settings = {{ATTRIBUTES = (RemoveHeadersOnCopy, ); }}; }};")
    a("/* End PBXBuildFile section */")
    a("")
    a("/* Begin PBXContainerItemProxy section */")
    for key, proxy in proxies.items():
        a("\t\t" + proxy + " /* PBXContainerItemProxy */ = {")
        a("\t\t\tisa = PBXContainerItemProxy;")
        a(f"\t\t\tcontainerPortal = {project_id} /* Project object */;")
        a("\t\t\tproxyType = 1;")
        a(f"\t\t\tremoteGlobalIDString = {targets[key]};")
        a(f"\t\t\tremoteInfo = {EXT if key == 'ext' else BLOCKER};")
        a("\t\t};")
    a("/* End PBXContainerItemProxy section */")
    a("")
    a("/* Begin PBXCopyFilesBuildPhase section */")
    a(f"\t\t{phases['app']['embed']} /* Embed Foundation Extensions */ = {{")
    a("\t\t\tisa = PBXCopyFilesBuildPhase;")
    a("\t\t\tbuildActionMask = 2147483647;")
    a('\t\t\tdstPath = "";')
    a("\t\t\tdstSubfolderSpec = 13;")
    a("\t\t\tfiles = (")
    for key in ("ext", "blocker"):
        a(f"\t\t\t\t{embed[key]} /* {products[key][1]} in Embed */,")
    a("\t\t\t);")
    a('\t\t\tname = "Embed Foundation Extensions";')
    a("\t\t\trunOnlyForDeploymentPostprocessing = 0;")
    a("\t\t};")
    a("/* End PBXCopyFilesBuildPhase section */")
    a("")
    a("/* Begin PBXFileReference section */")
    for name, path, kind, _group in FILES:
        filetype = FILE_TYPES[kind]
        a(f"\t\t{file_ids[name]} /* {name} */ = {{isa = PBXFileReference; lastKnownFileType = {filetype}; path = {q(path)}; sourceTree = SOURCE_ROOT; }};")
    for key, (product_id, product_name, filetype) in products.items():
        a(f"\t\t{product_id} /* {product_name} */ = {{isa = PBXFileReference; explicitFileType = {q(filetype)}; includeInIndex = 0; path = {q(product_name)}; sourceTree = BUILT_PRODUCTS_DIR; }};")
    for name, fw_id in fw_ids.items():
        a(f"\t\t{fw_id} /* {name} */ = {{isa = PBXFileReference; lastKnownFileType = wrapper.framework; name = {q(name)}; path = {q('System/Library/Frameworks/' + name)}; sourceTree = SDKROOT; }};")
    a("/* End PBXFileReference section */")
    a("")
    a("/* Begin PBXFrameworksBuildPhase section */")
    for target in ("app", "ext", "blocker"):
        a(f"\t\t{phases[target]['frameworks']} /* Frameworks */ = {{")
        a("\t\t\tisa = PBXFrameworksBuildPhase;")
        a("\t\t\tbuildActionMask = 2147483647;")
        a("\t\t\tfiles = (")
        for name in FRAMEWORKS[target]:
            a(f"\t\t\t\t{fw_build[(target, name)]} /* {name} */,")
        a("\t\t\t);")
        a("\t\t\trunOnlyForDeploymentPostprocessing = 0;")
        a("\t\t};")
    a("/* End PBXFrameworksBuildPhase section */")
    a("")

    def group(gid, name, children):
        a(f"\t\t{gid} /* {name} */ = {{")
        a("\t\t\tisa = PBXGroup;")
        a("\t\t\tchildren = (")
        for child_id, child_name in children:
            a(f"\t\t\t\t{child_id} /* {child_name} */,")
        a("\t\t\t);")
        a(f"\t\t\tname = {q(name)};")
        a('\t\t\tsourceTree = "<group>";')
        a("\t\t};")

    a("/* Begin PBXGroup section */")
    by_group = {}
    for name, _path, _kind, group_name in FILES:
        by_group.setdefault(group_name, []).append((file_ids[name], name))
    group(groups["app"], "App", by_group["app"])
    group(groups["extres"], "Resources", by_group["extres"])
    group(groups["ext"], "Extension", by_group["ext"] + [(groups["extres"], "Resources")])
    group(groups["blocker"], "ContentBlocker", by_group["blocker"])
    group(groups["shared"], "Shared", by_group["shared"])
    group(groups["web"], "blok", by_group["web"])
    group(groups["products"], "Products", [(products[key][0], products[key][1]) for key in ("app", "ext", "blocker")])
    group(groups["frameworks"], "Frameworks", [(fw_ids[name], name) for name in fw_ids])
    group(groups["main"], "Blok", [
        (groups["app"], "App"),
        (groups["ext"], "Extension"),
        (groups["blocker"], "ContentBlocker"),
        (groups["shared"], "Shared"),
        (groups["web"], "blok"),
        (groups["frameworks"], "Frameworks"),
        (groups["products"], "Products"),
    ])
    a("/* End PBXGroup section */")
    a("")
    a("/* Begin PBXNativeTarget section */")
    target_meta = {
        "app": (APP, "com.apple.product-type.application", [deps["ext"], deps["blocker"]], ["sources", "frameworks", "resources", "embed"]),
        "ext": (EXT, "com.apple.product-type.app-extension", [], ["sources", "frameworks", "resources"]),
        "blocker": (BLOCKER, "com.apple.product-type.app-extension", [], ["sources", "frameworks", "resources"]),
    }
    for key, (name, product_type, dependencies, phase_names) in target_meta.items():
        a(f"\t\t{targets[key]} /* {name} */ = {{")
        a("\t\t\tisa = PBXNativeTarget;")
        a(f"\t\t\tbuildConfigurationList = {target_lists[key]} /* Build configuration list for PBXNativeTarget \"{name}\" */;")
        a("\t\t\tbuildPhases = (")
        for phase_name in phase_names:
            label = "Embed Foundation Extensions" if phase_name == "embed" else phase_name.capitalize()
            a(f"\t\t\t\t{phases[key][phase_name]} /* {label} */,")
        a("\t\t\t);")
        a("\t\t\tbuildRules = (")
        a("\t\t\t);")
        a("\t\t\tdependencies = (")
        for dep in dependencies:
            a(f"\t\t\t\t{dep} /* PBXTargetDependency */,")
        a("\t\t\t);")
        a(f"\t\t\tname = {q(name)};")
        a(f"\t\t\tproductName = {q(name)};")
        a(f"\t\t\tproductReference = {products[key][0]} /* {products[key][1]} */;")
        a(f"\t\t\tproductType = {q(product_type)};")
        a("\t\t};")
    a("/* End PBXNativeTarget section */")
    a("")
    a("/* Begin PBXProject section */")
    a(f"\t\t{project_id} /* Project object */ = {{")
    a("\t\t\tisa = PBXProject;")
    a("\t\t\tattributes = {")
    a("\t\t\t\tBuildIndependentTargetsInParallel = 1;")
    a("\t\t\t\tLastSwiftUpdateCheck = 1600;")
    a("\t\t\t\tLastUpgradeCheck = 1600;")
    a("\t\t\t\tTargetAttributes = {")
    for key, name in (("app", APP), ("ext", EXT), ("blocker", BLOCKER)):
        a(f"\t\t\t\t\t{targets[key]} = {{")
        a("\t\t\t\t\t\tCreatedOnToolsVersion = 16.0;")
        a("\t\t\t\t\t};")
    a("\t\t\t\t};")
    a("\t\t\t};")
    a(f"\t\t\tbuildConfigurationList = {project_list} /* Build configuration list for PBXProject \"Blok\" */;")
    a('\t\t\tcompatibilityVersion = "Xcode 14.0";')
    a("\t\t\tdevelopmentRegion = en;")
    a("\t\t\thasScannedForEncodings = 0;")
    a("\t\t\tknownRegions = (")
    a("\t\t\t\ten,")
    a("\t\t\t\tBase,")
    a("\t\t\t);")
    a(f"\t\t\tmainGroup = {groups['main']} /* Blok */;")
    a(f"\t\t\tproductRefGroup = {groups['products']} /* Products */;")
    a('\t\t\tprojectDirPath = "";')
    a('\t\t\tprojectRoot = "";')
    a("\t\t\ttargets = (")
    for key, name in (("app", APP), ("ext", EXT), ("blocker", BLOCKER)):
        a(f"\t\t\t\t{targets[key]} /* {name} */,")
    a("\t\t\t);")
    a("\t\t};")
    a("/* End PBXProject section */")
    a("")
    a("/* Begin PBXResourcesBuildPhase section */")
    for target in ("app", "ext", "blocker"):
        a(f"\t\t{phases[target]['resources']} /* Resources */ = {{")
        a("\t\t\tisa = PBXResourcesBuildPhase;")
        a("\t\t\tbuildActionMask = 2147483647;")
        a("\t\t\tfiles = (")
        for name, members in MEMBERSHIP.items():
            for member_target, phase in members:
                if member_target == target and phase == "resource":
                    a(f"\t\t\t\t{build_ids[(name, target, phase)]} /* {name} */,")
        a("\t\t\t);")
        a("\t\t\trunOnlyForDeploymentPostprocessing = 0;")
        a("\t\t};")
    a("/* End PBXResourcesBuildPhase section */")
    a("")
    a("/* Begin PBXSourcesBuildPhase section */")
    for target in ("app", "ext", "blocker"):
        a(f"\t\t{phases[target]['sources']} /* Sources */ = {{")
        a("\t\t\tisa = PBXSourcesBuildPhase;")
        a("\t\t\tbuildActionMask = 2147483647;")
        a("\t\t\tfiles = (")
        for name, members in MEMBERSHIP.items():
            for member_target, phase in members:
                if member_target == target and phase == "source":
                    a(f"\t\t\t\t{build_ids[(name, target, phase)]} /* {name} */,")
        a("\t\t\t);")
        a("\t\t\trunOnlyForDeploymentPostprocessing = 0;")
        a("\t\t};")
    a("/* End PBXSourcesBuildPhase section */")
    a("")
    a("/* Begin PBXTargetDependency section */")
    for key, dep in deps.items():
        a(f"\t\t{dep} /* PBXTargetDependency */ = {{")
        a("\t\t\tisa = PBXTargetDependency;")
        a(f"\t\t\ttarget = {targets[key]} /* {EXT if key == 'ext' else BLOCKER} */;")
        a(f"\t\t\ttargetProxy = {proxies[key]} /* PBXContainerItemProxy */;")
        a("\t\t};")
    a("/* End PBXTargetDependency section */")
    a("")

    common_project = [
        ("ALWAYS_SEARCH_USER_PATHS", "NO"),
        ("CLANG_ANALYZER_NONNULL", "YES"),
        ("CLANG_ENABLE_MODULES", "YES"),
        ("CLANG_ENABLE_OBJC_ARC", "YES"),
        ("CLANG_WARN_BOOL_CONVERSION", "YES"),
        ("CLANG_WARN_DOCUMENTATION_COMMENTS", "YES"),
        ("CLANG_WARN_UNGUARDED_AVAILABILITY", "YES_AGGRESSIVE"),
        ("COPY_PHASE_STRIP", "NO"),
        ("DEBUG_INFORMATION_FORMAT", "dwarf"),
        ("ENABLE_STRICT_OBJC_MSGSEND", "YES"),
        ("ENABLE_USER_SCRIPT_SANDBOXING", "YES"),
        ("GCC_C_LANGUAGE_STANDARD", "gnu17"),
        ("GCC_NO_COMMON_BLOCKS", "YES"),
        ("GCC_WARN_UNINITIALIZED_AUTOS", "YES_AGGRESSIVE"),
        ("IPHONEOS_DEPLOYMENT_TARGET", "16.0"),
        ("MTL_ENABLE_DEBUG_INFO", "INCLUDE_SOURCE"),
        ("ONLY_ACTIVE_ARCH", "YES"),
        ("SDKROOT", "iphoneos"),
        ("SWIFT_ACTIVE_COMPILATION_CONDITIONS", "DEBUG"),
        ("SWIFT_OPTIMIZATION_LEVEL", "-Onone"),
        ("SWIFT_VERSION", "5.0"),
        ("TARGETED_DEVICE_FAMILY", "1"),
    ]
    release_overrides = {
        "COPY_PHASE_STRIP": "YES",
        "DEBUG_INFORMATION_FORMAT": "dwarf-with-dsym",
        "MTL_ENABLE_DEBUG_INFO": "NO",
        "ONLY_ACTIVE_ARCH": "NO",
        "SWIFT_COMPILATION_MODE": "wholemodule",
        "SWIFT_OPTIMIZATION_LEVEL": "-O",
        "VALIDATE_PRODUCT": "YES",
    }

    def config(cid, name, pairs):
        a(f"\t\t{cid} /* {name} */ = {{")
        a("\t\t\tisa = XCBuildConfiguration;")
        a(settings_block(pairs))
        a(f"\t\t\tname = {name};")
        a("\t\t};")

    a("/* Begin XCBuildConfiguration section */")
    config(configs[("project", "Debug")], "Debug", common_project)
    release = []
    for key, value in common_project:
        if key == "SWIFT_ACTIVE_COMPILATION_CONDITIONS":
            continue
        release.append((key, release_overrides.get(key, value)))
    release.append(("SWIFT_COMPILATION_MODE", "wholemodule"))
    config(configs[("project", "Release")], "Release", release)

    def target_settings(key, name):
        base = [
            ("ALWAYS_EMBED_SWIFT_STANDARD_LIBRARIES", "YES"),
            ("CODE_SIGN_STYLE", "Automatic"),
            ("CURRENT_PROJECT_VERSION", "1"),
            ("GENERATE_INFOPLIST_FILE", "YES"),
            ("IPHONEOS_DEPLOYMENT_TARGET", "16.0"),
            ("MARKETING_VERSION", "1.0.0"),
            ("PRODUCT_NAME", "$(TARGET_NAME)"),
            ("SDKROOT", "iphoneos"),
            ("SWIFT_EMIT_LOC_STRINGS", "YES"),
            ("SWIFT_VERSION", "5.0"),
            ("TARGETED_DEVICE_FAMILY", "1"),
            ("LD_RUNPATH_SEARCH_PATHS", ["$(inherited)", "@executable_path/Frameworks"]),
        ]
        if key == "app":
            base.extend([
                ("ASSETCATALOG_COMPILER_APPICON_NAME", "AppIcon"),
                ("ASSETCATALOG_COMPILER_GLOBAL_ACCENT_COLOR_NAME", "AccentColor"),
                ("CODE_SIGN_ENTITLEMENTS", "App/Blok.entitlements"),
                ("INFOPLIST_FILE", "App/Info.plist"),
                ("INFOPLIST_KEY_CFBundleDisplayName", "Blok"),
                ("INFOPLIST_KEY_LSApplicationCategoryType", "public.app-category.utilities"),
                ("PRODUCT_BUNDLE_IDENTIFIER", "com.erdos.blok"),
                ("PRODUCT_MODULE_NAME", "Blok"),
                ("SUPPORTS_MACCATALYST", "NO"),
            ])
        elif key == "ext":
            base.extend([
                ("APPLICATION_EXTENSION_API_ONLY", "YES"),
                ("CODE_SIGN_ENTITLEMENTS", "Extension/Extension.entitlements"),
                ("INFOPLIST_FILE", "Extension/Info.plist"),
                ("INFOPLIST_KEY_CFBundleDisplayName", "Blok"),
                ("PRODUCT_BUNDLE_IDENTIFIER", "com.erdos.blok.Extension"),
                ("PRODUCT_MODULE_NAME", "BlokExtension"),
                ("SKIP_INSTALL", "YES"),
                ("LD_RUNPATH_SEARCH_PATHS", ["$(inherited)", "@executable_path/Frameworks", "@executable_path/../../Frameworks"]),
            ])
        else:
            base.extend([
                ("APPLICATION_EXTENSION_API_ONLY", "YES"),
                ("CODE_SIGN_ENTITLEMENTS", "ContentBlocker/ContentBlocker.entitlements"),
                ("INFOPLIST_FILE", "ContentBlocker/Info.plist"),
                ("INFOPLIST_KEY_CFBundleDisplayName", "Blok Content Blocker"),
                ("PRODUCT_BUNDLE_IDENTIFIER", "com.erdos.blok.ContentBlocker"),
                ("PRODUCT_MODULE_NAME", "BlokContentBlocker"),
                ("SKIP_INSTALL", "YES"),
                ("LD_RUNPATH_SEARCH_PATHS", ["$(inherited)", "@executable_path/Frameworks", "@executable_path/../../Frameworks"]),
            ])
        # LD_RUNPATH appears twice for ext/blocker because base already has it. Remove the first.
        if key != "app":
            base = [item for item in base if item[0] != "LD_RUNPATH_SEARCH_PATHS" or item[1] != ["$(inherited)", "@executable_path/Frameworks"]]
        debug = base + [("SWIFT_ACTIVE_COMPILATION_CONDITIONS", "DEBUG"), ("SWIFT_OPTIMIZATION_LEVEL", "-Onone")]
        rel = base + [("SWIFT_COMPILATION_MODE", "wholemodule"), ("SWIFT_OPTIMIZATION_LEVEL", "-O")]
        config(configs[(key, "Debug")], "Debug", debug)
        config(configs[(key, "Release")], "Release", rel)

    for key in ("app", "ext", "blocker"):
        target_settings(key, target_meta[key][0])
    a("/* End XCBuildConfiguration section */")
    a("")
    a("/* Begin XCConfigurationList section */")

    def config_list(lid, label, scope):
        a(f"\t\t{lid} /* {label} */ = {{")
        a("\t\t\tisa = XCConfigurationList;")
        a("\t\t\tbuildConfigurations = (")
        a(f"\t\t\t\t{configs[(scope, 'Debug')]} /* Debug */,")
        a(f"\t\t\t\t{configs[(scope, 'Release')]} /* Release */,")
        a("\t\t\t);")
        a("\t\t\tdefaultConfigurationIsVisible = 0;")
        a("\t\t\tdefaultConfigurationName = Release;")
        a("\t\t};")

    config_list(project_list, 'Build configuration list for PBXProject "Blok"', "project")
    for key, name in (("app", APP), ("ext", EXT), ("blocker", BLOCKER)):
        config_list(target_lists[key], f'Build configuration list for PBXNativeTarget "{name}"', key)
    a("/* End XCConfigurationList section */")
    a("\t};")
    a(f"\trootObject = {project_id} /* Project object */;")
    a("}")
    a("")

    dest = PROJECT / "project.pbxproj"
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_text("\n".join(lines))
    scheme_dir = PROJECT / "xcshareddata" / "xcschemes"
    scheme_dir.mkdir(parents=True, exist_ok=True)
    (scheme_dir / "Blok.xcscheme").write_text(scheme(targets["app"]))
    workspace = PROJECT / "project.xcworkspace"
    workspace.mkdir(parents=True, exist_ok=True)
    (workspace / "contents.xcworkspacedata").write_text(
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<Workspace version = "1.0">\n'
        '   <FileRef location = "self:"></FileRef>\n'
        '</Workspace>\n'
    )
    print(dest)


def scheme(app_id: str) -> str:
    return f"""<?xml version="1.0" encoding="UTF-8"?>
<Scheme
   LastUpgradeVersion = "1600"
   version = "1.7">
   <BuildAction
      parallelizeBuildables = "YES"
      buildImplicitDependencies = "YES">
      <BuildActionEntries>
         <BuildActionEntry
            buildForTesting = "YES"
            buildForRunning = "YES"
            buildForProfiling = "YES"
            buildForArchiving = "YES"
            buildForAnalyzing = "YES">
            <BuildableReference
               BuildableIdentifier = "primary"
               BlueprintIdentifier = "{app_id}"
               BuildableName = "Blok.app"
               BlueprintName = "Blok"
               ReferencedContainer = "container:Blok.xcodeproj">
            </BuildableReference>
         </BuildActionEntry>
      </BuildActionEntries>
   </BuildAction>
   <TestAction
      buildConfiguration = "Debug"
      selectedDebuggerIdentifier = "Xcode.DebuggerFoundation.Debugger.LLDB"
      selectedLauncherIdentifier = "Xcode.DebuggerFoundation.Launcher.LLDB"
      shouldUseLaunchSchemeArgsEnv = "YES">
   </TestAction>
   <LaunchAction
      buildConfiguration = "Debug"
      selectedDebuggerIdentifier = "Xcode.DebuggerFoundation.Debugger.LLDB"
      selectedLauncherIdentifier = "Xcode.DebuggerFoundation.Launcher.LLDB"
      launchStyle = "0"
      useCustomWorkingDirectory = "NO"
      ignoresPersistentStateOnLaunch = "NO"
      debugDocumentVersioning = "YES"
      debugServiceExtension = "internal"
      allowLocationSimulation = "YES">
      <BuildableProductRunnable
         runnableDebuggingMode = "0">
         <BuildableReference
            BuildableIdentifier = "primary"
            BlueprintIdentifier = "{app_id}"
            BuildableName = "Blok.app"
            BlueprintName = "Blok"
            ReferencedContainer = "container:Blok.xcodeproj">
         </BuildableReference>
      </BuildableProductRunnable>
   </LaunchAction>
   <ProfileAction
      buildConfiguration = "Release"
      shouldUseLaunchSchemeArgsEnv = "YES"
      savedToolIdentifier = ""
      useCustomWorkingDirectory = "NO"
      debugDocumentVersioning = "YES">
      <BuildableProductRunnable
         runnableDebuggingMode = "0">
         <BuildableReference
            BuildableIdentifier = "primary"
            BlueprintIdentifier = "{app_id}"
            BuildableName = "Blok.app"
            BlueprintName = "Blok"
            ReferencedContainer = "container:Blok.xcodeproj">
         </BuildableReference>
      </BuildableProductRunnable>
   </ProfileAction>
   <AnalyzeAction
      buildConfiguration = "Debug">
   </AnalyzeAction>
   <ArchiveAction
      buildConfiguration = "Release"
      revealArchiveInOrganizer = "YES">
   </ArchiveAction>
</Scheme>
"""


if __name__ == "__main__":
    main()
