import numpy as np

from pyworld3 import World3

from .models import SimulationRequest, SimulationResponse, TimeSeriesOutput

CONSTANT_DEFAULTS: dict[str, float] = {
    # Population sector
    "p1i": 65e7,
    "p2i": 70e7,
    "p3i": 19e7,
    "p4i": 6e7,
    "dcfsn": 3.8,
    "fcest": 4000,
    "hsid": 20,
    "ieat": 3,
    "len": 28,
    "lpd": 20,
    "mtfn": 12,
    "pet": 4000,
    "rlt": 30,
    "sad": 20,
    "zpgt": 4000,
    # Capital sector
    "ici": 2.1e11,
    "sci": 1.44e11,
    "iet": 4000,
    "iopcd": 400,
    "lfpf": 0.75,
    "lufdt": 2,
    "icor1": 3,
    "icor2": 3,
    "scor1": 1,
    "scor2": 1,
    "alic1": 14,
    "alic2": 14,
    "alsc1": 20,
    "alsc2": 20,
    "fioac1": 0.43,
    "fioac2": 0.43,
    # Agriculture sector
    "ali": 0.9e9,
    "pali": 2.3e9,
    "lfh": 0.7,
    "palt": 3.2e9,
    "pl": 0.1,
    "alai1": 2,
    "alai2": 2,
    "io70": 7.9e11,
    "lyf1": 1,
    "lyf2": 1,
    "sd": 0.07,
    "uili": 8.2e6,
    "alln": 1000,
    "uildt": 10,
    "lferti": 600,
    "ilf": 600,
    "fspd": 2,
    "sfpc": 230,
    # Pollution sector
    "ppoli": 2.5e7,
    "ppol70": 1.36e8,
    "ahl70": 1.5,
    "amti": 1,
    "imti": 10,
    "imef": 0.1,
    "fipm": 0.001,
    "frpm": 0.02,
    "ppgf1": 1,
    "ppgf2": 1,
    "ppgf21": 1,
    "pptd1": 20,
    "pptd2": 20,
    # Resource sector
    "nri": 1e12,
    "nruf1": 1,
    "nruf2": 1,
}

DEFAULT_OUTPUT_VARIABLES: list[str] = [
    "pop",
    "nr",
    "nrfr",
    "io",
    "iopc",
    "fpc",
    "f",
    "so",
    "sopc",
    "ppolx",
    "ppol",
    "al",
    "ly",
    "le",
    "cbr",
    "cdr",
    "fioaa",
    "fcaor",
    "tai",
    "aiph",
]


def run_simulation(request: SimulationRequest) -> SimulationResponse:
    world3 = World3(
        year_min=request.year_min,
        year_max=request.year_max,
        dt=request.dt,
        pyear=request.pyear,
        iphst=request.iphst,
    )

    merged = dict(CONSTANT_DEFAULTS)
    if request.constants:
        unknown = set(request.constants) - set(CONSTANT_DEFAULTS)
        if unknown:
            raise ValueError(f"Unknown constants: {', '.join(sorted(unknown))}")
        merged.update(request.constants)

    world3.init_world3_constants(**merged)
    world3.init_world3_variables()
    world3.set_world3_table_functions()
    world3.set_world3_delay_functions()
    world3.run_world3(fast=True)

    output_vars = request.output_variables or DEFAULT_OUTPUT_VARIABLES
    unknown_vars = [v for v in output_vars if not hasattr(world3, v)]
    if unknown_vars:
        raise ValueError(f"Unknown output variables: {', '.join(unknown_vars)}")

    series: dict[str, TimeSeriesOutput] = {}
    for var_name in output_vars:
        raw = getattr(world3, var_name)
        values = np.nan_to_num(raw, nan=0.0).tolist()
        series[var_name] = TimeSeriesOutput(name=var_name, values=values)

    return SimulationResponse(
        year_min=request.year_min,
        year_max=request.year_max,
        dt=request.dt,
        time=world3.time.tolist(),
        constants_used=merged,
        series=series,
    )
