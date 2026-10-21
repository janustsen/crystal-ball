#!/usr/bin/env python3
"""Check the built app, since Expo config alone cannot detect a stale native plist."""
import os
import pathlib
import plistlib
import sys
from urllib.parse import urlparse


def check(app, engine, token):
    url = urlparse(engine)
    if url.scheme not in ("http", "https") or not url.hostname:
        raise ValueError("Set EXPO_PUBLIC_ENGINE_URL to the engine URL used for this build.")
    info = plistlib.loads((app / "Info.plist").read_bytes())
    if url.scheme == "http" and url.hostname.endswith(".ts.net"):
        ats = info.get("NSAppTransportSecurity", {})
        exception = ats.get("NSExceptionDomains", {}).get(url.hostname, {})
        if exception.get("NSExceptionAllowsInsecureHTTPLoads") is not True:
            raise ValueError("Built app lacks the engine hostname's ATS exception. Export EXPO_PUBLIC_ENGINE_URL before Expo prebuild, then rebuild.")
        if not token:
            raise ValueError("Set EXPO_PUBLIC_PREVIEW_SECRET to the running preview's token.")
    bundle = (app / "main.jsbundle").read_bytes()
    if engine.encode() not in bundle or (token and token.encode() not in bundle):
        raise ValueError("Built JavaScript does not contain the configured engine URL/token. Rebuild with the same environment used for prebuild.")


if __name__ == "__main__":
    try:
        check(pathlib.Path(sys.argv[1]), os.environ.get("EXPO_PUBLIC_ENGINE_URL", ""), os.environ.get("EXPO_PUBLIC_PREVIEW_SECRET", ""))
    except (IndexError, OSError, ValueError, plistlib.InvalidFileException) as error:
        sys.exit(f"iOS engine check failed: {error}")
    print("iOS engine check passed: built native transport and JavaScript match the configured engine.")
