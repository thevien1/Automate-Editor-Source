"""Native macOS mouse clicks. Requires Python 3 + pyobjc-framework-Quartz."""
import json
import math
import sys
import time

try:
    import Quartz as q

    if not q.AXIsProcessTrusted():
        raise RuntimeError("Cho phép ứng dụng trong System Settings > Privacy & Security > Accessibility.")
    x, y = float(sys.argv[1]), float(sys.argv[2])
    if not math.isfinite(x) or not math.isfinite(y):
        raise ValueError("Invalid coordinates")
    button = sys.argv[3]
    count = max(1, min(100, int(sys.argv[4])))
    events = {
        "left": (q.kCGEventLeftMouseDown, q.kCGEventLeftMouseUp, q.kCGMouseButtonLeft),
        "right": (q.kCGEventRightMouseDown, q.kCGEventRightMouseUp, q.kCGMouseButtonRight),
        "middle": (q.kCGEventOtherMouseDown, q.kCGEventOtherMouseUp, q.kCGMouseButtonCenter),
    }
    down, up, native_button = events[button]
    for index in range(count):
        for event_type in (down, up):
            event = q.CGEventCreateMouseEvent(None, event_type, (x, y), native_button)
            q.CGEventSetIntegerValueField(event, q.kCGMouseEventClickState, index + 1)
            q.CGEventPost(q.kCGHIDEventTap, event)
            time.sleep(0.035)
    print(json.dumps({"success": True}))
except Exception as error:
    print(json.dumps({"success": False, "error": str(error)}, ensure_ascii=False))
    sys.exit(1)
