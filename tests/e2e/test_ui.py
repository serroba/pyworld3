"""End-to-end smoke tests for the PyWorld3 web UI."""

import pytest
from playwright.sync_api import Page, expect

pytestmark = pytest.mark.e2e


def set_provider_mode(page: Page, mode: str):
    """Override the browser-side simulation provider mode before app boot."""
    page.add_init_script(
        f"window.__PYWORLD3_PROVIDER_MODE__ = {mode!r};"
    )


def test_homepage_loads(page: Page, base_url: str):
    """Page title, nav bar, and preset cards are rendered."""
    page.goto(base_url)
    expect(page).to_have_title("PyWorld3 — World3 Scenario Explorer")
    expect(page.locator("nav.site-nav")).to_be_visible()
    # Preset cards should be rendered inside #intro-presets
    page.wait_for_selector("#intro-presets .card", timeout=10_000)
    cards = page.locator("#intro-presets .card")
    assert cards.count() > 0


def test_navigate_to_explore(page: Page, base_url: str):
    """Click 'Start exploring' → explore view visible with preset pills."""
    page.goto(base_url)
    page.click("a.btn-primary:has-text('Start exploring')")
    expect(page.locator("#view-explore")).to_be_visible()
    page.wait_for_selector("#explore-pills button", timeout=10_000)
    pills = page.locator("#explore-pills button")
    assert pills.count() > 0


def test_explore_preset_renders_charts(page: Page, base_url: str):
    """Click a preset pill → canvas charts appear, no error card."""
    page.goto(f"{base_url}/#explore")
    page.wait_for_selector("#explore-pills button", timeout=10_000)
    page.locator("#explore-pills button").first.click()
    page.wait_for_selector("#explore-charts canvas", timeout=30_000)
    canvases = page.locator("#explore-charts canvas")
    assert canvases.count() > 0
    # No error card should be visible
    assert page.locator("#explore-charts .card--error").count() == 0


def test_http_provider_mode_explore_still_works(page: Page, base_url: str):
    """Explicit HTTP provider mode should preserve the current behavior."""
    set_provider_mode(page, "http")
    page.goto(f"{base_url}/#explore")
    page.wait_for_selector("#explore-pills button", timeout=10_000)
    page.locator("#explore-pills button").first.click()
    page.wait_for_selector("#explore-charts canvas", timeout=30_000)
    assert page.locator("#explore-status .card").count() == 0


def test_local_provider_mode_standard_run_renders_explore_charts(
    page: Page, base_url: str
):
    """Local provider mode should render the fixture-backed standard run."""
    set_provider_mode(page, "local")
    page.goto(f"{base_url}/#explore?preset=standard-run")
    page.wait_for_selector("#explore-charts canvas", timeout=30_000)
    assert page.locator("#explore-status .card").count() == 0


def test_local_provider_mode_nonstandard_preset_renders_explore_charts(
    page: Page, base_url: str
):
    """Local provider mode should handle preset overrides without the backend."""
    set_provider_mode(page, "local")
    page.goto(f"{base_url}/#explore?preset=doubled-resources")
    page.wait_for_selector("#explore-charts canvas", timeout=30_000)
    assert page.locator("#explore-status .card").count() == 0


def test_compare_view_loads_metrics(page: Page, base_url: str):
    """Navigate to compare → select presets → metrics table rows appear."""
    page.goto(f"{base_url}/#compare")
    # Wait for options to be populated (options inside <select> aren't "visible")
    page.locator("#compare-select-a").wait_for(timeout=10_000)
    page.wait_for_function(
        "document.querySelectorAll('#compare-select-a option').length > 0",
        timeout=10_000,
    )

    # Select presets in each dropdown
    select_a = page.locator("#compare-select-a")
    select_b = page.locator("#compare-select-b")
    select_a.select_option(index=0)
    select_b.select_option(index=1)

    # Wait for metrics to render
    page.wait_for_selector(
        "#compare-metrics tr, #compare-metrics .metric-row", timeout=30_000
    )


def test_local_provider_mode_compare_view_loads_metrics(page: Page, base_url: str):
    """Local provider mode should compare preset scenarios without HTTP calls."""
    set_provider_mode(page, "local")
    page.goto(f"{base_url}/#compare")
    page.locator("#compare-select-a").wait_for(timeout=10_000)
    page.wait_for_function(
        "document.querySelectorAll('#compare-select-a option').length > 0",
        timeout=10_000,
    )
    page.locator("#compare-select-a").select_option(index=0)
    page.locator("#compare-select-b").select_option(index=1)
    page.wait_for_selector(
        "#compare-metrics tr, #compare-metrics .metric-row", timeout=30_000
    )
    expect(page.locator("#compare-metrics")).to_contain_text("Population")


def test_advanced_view_has_controls(page: Page, base_url: str):
    """Navigate to advanced → accordion sections and range inputs visible."""
    page.goto(f"{base_url}/#advanced")
    page.wait_for_selector("#advanced-accordions", timeout=10_000)
    accordions = page.locator(
        "#advanced-accordions details, #advanced-accordions .accordion"
    )
    assert accordions.count() > 0
    inputs = page.locator("#advanced-accordions input[type='range']")
    assert inputs.count() > 0


def test_advanced_run_simulation(page: Page, base_url: str):
    """Click run button → charts appear, no error overlay."""
    page.goto(f"{base_url}/#advanced")
    page.wait_for_selector("#advanced-run", timeout=10_000)
    page.click("#advanced-run")
    page.wait_for_selector("#advanced-charts canvas", timeout=30_000)
    canvases = page.locator("#advanced-charts canvas")
    assert canvases.count() > 0
    # No error overlay
    assert page.locator("#advanced-charts .error-overlay").count() == 0


def test_calibrate_view_loads(page: Page, base_url: str):
    """Navigate to #calibrate → controls are visible."""
    page.goto(f"{base_url}/#calibrate")
    expect(page.locator("#view-calibrate")).to_be_visible()
    expect(page.locator("#calibrate-entity")).to_be_visible()
    expect(page.locator("#calibrate-year")).to_be_visible()
    expect(page.locator("#calibrate-run")).to_be_visible()
    expect(page.locator("#validate-entity")).to_be_visible()
    expect(page.locator("#validate-run")).to_be_visible()


def test_calibrate_runs(page: Page, base_url: str):
    """Click Calibrate → results table or error card appears (no JS crash)."""
    page.goto(f"{base_url}/#calibrate")
    page.wait_for_selector("#calibrate-run", timeout=10_000)
    page.click("#calibrate-run")
    # Wait for either a results table or an error card to appear
    page.wait_for_selector(
        "#calibrate-results table, #calibrate-status .card",
        timeout=30_000,
    )
