from typing import NamedTuple


class ConstantMeta(NamedTuple):
    full_name: str
    unit: str
    sector: str


class VariableMeta(NamedTuple):
    full_name: str
    unit: str
    sector: str


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

CONSTANT_META: dict[str, ConstantMeta] = {
    # Population sector
    "p1i": ConstantMeta("Initial population 0-14", "people", "Population"),
    "p2i": ConstantMeta("Initial population 15-44", "people", "Population"),
    "p3i": ConstantMeta("Initial population 45-64", "people", "Population"),
    "p4i": ConstantMeta("Initial population 65+", "people", "Population"),
    "dcfsn": ConstantMeta(
        "Desired completed family size normal", "children", "Population"
    ),
    "fcest": ConstantMeta(
        "Fertility control effectiveness set time", "year", "Population"
    ),
    "hsid": ConstantMeta("Health services impact delay", "years", "Population"),
    "ieat": ConstantMeta("Income expectation averaging time", "years", "Population"),
    "len": ConstantMeta("Life expectancy normal", "years", "Population"),
    "lpd": ConstantMeta("Lifetime perception delay", "years", "Population"),
    "mtfn": ConstantMeta("Maximum total fertility normal", "children", "Population"),
    "pet": ConstantMeta("Population equilibrium time", "year", "Population"),
    "rlt": ConstantMeta("Reproductive lifetime", "years", "Population"),
    "sad": ConstantMeta("Social adjustment delay", "years", "Population"),
    "zpgt": ConstantMeta("Zero population growth time", "year", "Population"),
    # Capital sector
    "ici": ConstantMeta("Initial industrial capital", "$", "Capital"),
    "sci": ConstantMeta("Initial service capital", "$", "Capital"),
    "iet": ConstantMeta("Industrial equilibrium time", "year", "Capital"),
    "iopcd": ConstantMeta(
        "Industrial output per capita desired", "$/person/yr", "Capital"
    ),
    "lfpf": ConstantMeta("Labor force participation fraction", "-", "Capital"),
    "lufdt": ConstantMeta("Labor utilization fraction delay time", "years", "Capital"),
    "icor1": ConstantMeta("Industrial capital-output ratio 1", "years", "Capital"),
    "icor2": ConstantMeta("Industrial capital-output ratio 2", "years", "Capital"),
    "scor1": ConstantMeta("Service capital-output ratio 1", "years", "Capital"),
    "scor2": ConstantMeta("Service capital-output ratio 2", "years", "Capital"),
    "alic1": ConstantMeta("Avg lifetime industrial capital 1", "years", "Capital"),
    "alic2": ConstantMeta("Avg lifetime industrial capital 2", "years", "Capital"),
    "alsc1": ConstantMeta("Avg lifetime service capital 1", "years", "Capital"),
    "alsc2": ConstantMeta("Avg lifetime service capital 2", "years", "Capital"),
    "fioac1": ConstantMeta(
        "Fraction industrial output for consumption 1", "-", "Capital"
    ),
    "fioac2": ConstantMeta(
        "Fraction industrial output for consumption 2", "-", "Capital"
    ),
    # Agriculture sector
    "ali": ConstantMeta("Initial arable land", "ha", "Agriculture"),
    "pali": ConstantMeta("Initial potentially arable land", "ha", "Agriculture"),
    "lfh": ConstantMeta("Land fraction harvested", "-", "Agriculture"),
    "palt": ConstantMeta("Potentially arable land total", "ha", "Agriculture"),
    "pl": ConstantMeta("Processing loss", "-", "Agriculture"),
    "alai1": ConstantMeta("Avg lifetime agricultural input 1", "years", "Agriculture"),
    "alai2": ConstantMeta("Avg lifetime agricultural input 2", "years", "Agriculture"),
    "io70": ConstantMeta("Industrial output in 1970", "$/yr", "Agriculture"),
    "lyf1": ConstantMeta("Land yield factor 1", "-", "Agriculture"),
    "lyf2": ConstantMeta("Land yield factor 2", "-", "Agriculture"),
    "sd": ConstantMeta("Social discount", "-", "Agriculture"),
    "uili": ConstantMeta("Initial urban-industrial land", "ha", "Agriculture"),
    "alln": ConstantMeta("Average life of land normal", "years", "Agriculture"),
    "uildt": ConstantMeta(
        "Urban-industrial land development time", "years", "Agriculture"
    ),
    "lferti": ConstantMeta("Initial land fertility", "kg/ha/yr", "Agriculture"),
    "ilf": ConstantMeta("Inherent land fertility", "kg/ha/yr", "Agriculture"),
    "fspd": ConstantMeta("Food shortage perception delay", "years", "Agriculture"),
    "sfpc": ConstantMeta("Subsistence food per capita", "kg/yr", "Agriculture"),
    # Pollution sector
    "ppoli": ConstantMeta(
        "Initial persistent pollution", "pollution units", "Pollution"
    ),
    "ppol70": ConstantMeta("Pollution level in 1970", "pollution units", "Pollution"),
    "ahl70": ConstantMeta("Assimilation half-life in 1970", "years", "Pollution"),
    "amti": ConstantMeta("Agricultural material toxicity index", "-", "Pollution"),
    "imti": ConstantMeta("Industrial material toxicity index", "-", "Pollution"),
    "imef": ConstantMeta("Industrial material emission factor", "-", "Pollution"),
    "fipm": ConstantMeta("Fraction industrial pollution manageable", "-", "Pollution"),
    "frpm": ConstantMeta("Fraction resources as pollution material", "-", "Pollution"),
    "ppgf1": ConstantMeta("Persistent pollution gen factor 1", "-", "Pollution"),
    "ppgf2": ConstantMeta("Persistent pollution gen factor 2", "-", "Pollution"),
    "ppgf21": ConstantMeta(
        "Persistent pollution gen factor 2 (post-policy)", "-", "Pollution"
    ),
    "pptd1": ConstantMeta("Pollution transmission delay 1", "years", "Pollution"),
    "pptd2": ConstantMeta("Pollution transmission delay 2", "years", "Pollution"),
    # Resource sector
    "nri": ConstantMeta(
        "Initial nonrenewable resources", "resource units", "Resources"
    ),
    "nruf1": ConstantMeta("Nonrenewable resource usage factor 1", "-", "Resources"),
    "nruf2": ConstantMeta("Nonrenewable resource usage factor 2", "-", "Resources"),
}

VARIABLE_META: dict[str, VariableMeta] = {
    "pop": VariableMeta("Total population", "people", "Population"),
    "nr": VariableMeta(
        "Nonrenewable resources remaining", "resource units", "Resources"
    ),
    "nrfr": VariableMeta("Nonrenewable resource fraction remaining", "-", "Resources"),
    "io": VariableMeta("Industrial output", "$/yr", "Capital"),
    "iopc": VariableMeta("Industrial output per capita", "$/person/yr", "Capital"),
    "fpc": VariableMeta("Food per capita", "kg/person/yr", "Agriculture"),
    "f": VariableMeta("Total food production", "kg/yr", "Agriculture"),
    "so": VariableMeta("Service output", "$/yr", "Capital"),
    "sopc": VariableMeta("Service output per capita", "$/person/yr", "Capital"),
    "ppolx": VariableMeta("Pollution index", "-", "Pollution"),
    "ppol": VariableMeta("Persistent pollution", "pollution units", "Pollution"),
    "al": VariableMeta("Arable land", "ha", "Agriculture"),
    "ly": VariableMeta("Land yield", "kg/ha/yr", "Agriculture"),
    "le": VariableMeta("Life expectancy", "years", "Population"),
    "cbr": VariableMeta("Crude birth rate", "births/1000/yr", "Population"),
    "cdr": VariableMeta("Crude death rate", "deaths/1000/yr", "Population"),
    "fioaa": VariableMeta("Fraction industrial output for agriculture", "-", "Capital"),
    "fcaor": VariableMeta(
        "Fraction capital allocated to obtaining resources", "-", "Resources"
    ),
    "tai": VariableMeta("Total agricultural investment", "$/yr", "Agriculture"),
    "aiph": VariableMeta("Agricultural inputs per hectare", "$/ha/yr", "Agriculture"),
}

# (min, max) bounds for each constant. None means unbounded on that side.
CONSTANT_CONSTRAINTS: dict[str, tuple[float | None, float | None]] = {
    # Population initials (ge=0)
    "p1i": (0, None),
    "p2i": (0, None),
    "p3i": (0, None),
    "p4i": (0, None),
    # Population time delays / rates (gt=0)
    "dcfsn": (0, None),
    "fcest": (0, None),
    "hsid": (0, None),
    "ieat": (0, None),
    "len": (0, None),
    "lpd": (0, None),
    "mtfn": (0, None),
    "pet": (0, None),
    "rlt": (0, None),
    "sad": (0, None),
    "zpgt": (0, None),
    # Capital initials (ge=0)
    "ici": (0, None),
    "sci": (0, None),
    # Capital time delays / rates (gt=0)
    "iet": (0, None),
    "iopcd": (0, None),
    "lufdt": (0, None),
    # Capital multipliers / ratios (gt=0)
    "icor1": (0, None),
    "icor2": (0, None),
    "scor1": (0, None),
    "scor2": (0, None),
    "alic1": (0, None),
    "alic2": (0, None),
    "alsc1": (0, None),
    "alsc2": (0, None),
    # Fractions (ge=0, le=1)
    "lfpf": (0, 1),
    "fioac1": (0, 1),
    "fioac2": (0, 1),
    # Agriculture initials (ge=0)
    "ali": (0, None),
    "pali": (0, None),
    "io70": (0, None),
    "uili": (0, None),
    # Agriculture fractions / rates
    "lfh": (0, 1),
    "palt": (0, None),
    "pl": (0, 1),
    "alai1": (0, None),
    "alai2": (0, None),
    "lyf1": (0, None),
    "lyf2": (0, None),
    "sd": (0, None),
    "alln": (0, None),
    "uildt": (0, None),
    "lferti": (0, None),
    "ilf": (0, None),
    "fspd": (0, None),
    "sfpc": (0, None),
    # Pollution initials (ge=0)
    "ppoli": (0, None),
    "ppol70": (0, None),
    # Pollution rates / multipliers (gt=0)
    "ahl70": (0, None),
    "amti": (0, None),
    "imti": (0, None),
    "imef": (0, None),
    "fipm": (0, None),
    "frpm": (0, None),
    "ppgf1": (0, None),
    "ppgf2": (0, None),
    "ppgf21": (0, None),
    "pptd1": (0, None),
    "pptd2": (0, None),
    # Resource initial (ge=0)
    "nri": (0, None),
    # Resource multipliers (gt=0)
    "nruf1": (0, None),
    "nruf2": (0, None),
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
