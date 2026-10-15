# Homepage video banner

Composition reference: https://motionsites.ai/?prompt=zenith-footer

Current footage: “A woman running on a grassy hill”, Khanh Hoang Minh 2, Pexels, video 18206674.
Source: https://www.pexels.com/video/a-woman-running-on-a-grassy-hill-18206674/
License: https://www.pexels.com/license/

The Pexels page describes a woman hiking on a sunny day. This is alternate clean footage, not the exact two-runner scene in the MotionSites preview. No MotionSites footage or template code is included. The person shown is not presented as a Wasay employee, customer or endorser.

Project media:
- static/videos/wellness-hillside.mp4: local silent H.264, 1600 x 900, about 11.2 seconds and 2.6 MB. The first eight seconds of the source are played at a slower pace with a one-second crossfade toward the opening.
- static/images/wasay/wellness-video-poster.webp: first frame of the finished clip, for loading, disabled motion and playback failures.

The old generated wellness-hillside.webp is no longer referenced by the banner. Actual walking is now recorded movement in video frames; no CSS zoom or simulated walk is used.

The video starts muted when visible, pauses offscreen and in background tabs, and respects reduced motion. An explicit Play action can start it under reduced motion. If autoplay is blocked, the Play button remains available. If loading fails, the poster remains and the control reports that video is unavailable.
