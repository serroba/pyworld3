class SimulationValidationError(ValueError):
    """Raised for validation errors in simulation inputs/outputs.

    This is a subclass of ValueError so existing code that catches ValueError
    continues to work, but it can be caught specifically to distinguish our
    validation messages from unexpected ValueErrors deeper in the stack.

    The ``safe_message`` attribute provides a user-facing description that is
    safe to expose in HTTP responses without risk of leaking internal details.
    """

    def __init__(self, safe_message: str) -> None:
        super().__init__(safe_message)
        self.safe_message = safe_message
