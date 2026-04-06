"""DRF renderers for non-JSON responses (e.g. SSE)."""

from rest_framework.renderers import BaseRenderer, JSONRenderer


class EventStreamRenderer(BaseRenderer):
    """
    Satisfies content negotiation for `Accept: text/event-stream`.
    Successful responses return StreamingHttpResponse and bypass `.render()`.
    Error Responses still serialize as JSON bytes so clients can parse them.
    """

    media_type = "text/event-stream"
    format = "sse"
    charset = "utf-8"

    def render(self, data, accepted_media_type=None, renderer_context=None):
        if data is None:
            return b""
        return JSONRenderer().render(data, accepted_media_type, renderer_context)
