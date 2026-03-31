/**
 * Model page section data — each entry defines a question-section with
 * three progressive disclosure levels: plain English, equations, constants.
 */

/* exported MODEL_SECTIONS */
const MODEL_SECTIONS = [
  // -----------------------------------------------------------------------
  // 1. Population
  // -----------------------------------------------------------------------
  {
    id: "pop-capacity",
    question: "Can Earth support 10 billion people?",
    shortLabel: "Population",
    preset: "standard-run",
    chartVars: ["pop", "le"],
    summary:
      "The model says it depends on how fast we consume resources and how much pollution " +
      "we generate. Population peaks and then declines when food or health services can no " +
      "longer keep up. In the standard run, population peaks around 2030 at roughly 8.4 billion, " +
      "then falls as life expectancy drops.",
    concepts: [
      {
        term: "Four age cohorts",
        definition:
          "World3 splits the population into four groups: 0\u201314, 15\u201344, 45\u201364, and 65+. " +
          "People flow from one cohort to the next as they age. Each cohort has its own " +
          "mortality rate influenced by food, pollution, health services, and crowding.",
      },
      {
        term: "Birth control & fertility",
        definition:
          "Fertility is driven by desired family size, which depends on income and life " +
          "expectancy. As industrial output rises, families choose fewer children. A " +
          "\u201cfertility control effectiveness\u201d factor (0\u20131) models how well " +
          "contraception works, improving over time with health services.",
      },
    ],
    equations: {
      preamble:
        "Population is the sum of four cohort stocks (P1\u2013P4). Each stock changes " +
        "by inflows from births or maturation and outflows from death or maturation " +
        "to the next group. Life expectancy is a base value multiplied by four factors.",
      items: [
        {
          label: "Total population",
          html:
            '<span class="eq-var">POP</span> = ' +
            '<span class="eq-var">P1</span> + <span class="eq-var">P2</span> + ' +
            '<span class="eq-var">P3</span> + <span class="eq-var">P4</span>',
        },
        {
          label: "Cohort change (ages 0\u201314)",
          html:
            '<span class="eq-frac"><span class="eq-num">d<span class="eq-var">P1</span></span>' +
            '<span class="eq-den">d<span class="eq-var">t</span></span></span> = ' +
            '<span class="eq-var">B</span> \u2212 <span class="eq-var">D1</span> \u2212 ' +
            '<span class="eq-var">Mat1</span>',
        },
        {
          label: "Life expectancy",
          html:
            '<span class="eq-var">LE</span> = ' +
            '<span class="eq-var">LEN</span> \u00d7 ' +
            '<span class="eq-var">LMF</span> \u00d7 ' +
            '<span class="eq-var">LMHS</span> \u00d7 ' +
            '<span class="eq-var">LMP</span> \u00d7 ' +
            '<span class="eq-var">LMC</span>',
        },
      ],
      feedback:
        "This is a reinforcing loop: higher life expectancy \u2192 more people \u2192 more " +
        "industrial output \u2192 better health services \u2192 higher life expectancy. But " +
        "pollution and food shortages create balancing loops that eventually dominate.",
    },
    constantKeys: ["len", "p1i", "p2i", "p3i", "p4i", "dcfsn", "zpgt", "pet", "fce"],
    sources: [
      { text: "Dynamics of Growth in a Finite World, Ch. 2 \u2014 Population Sector", url: null },
      { text: "Limits to Growth: The 30-Year Update, Ch. 3", url: null },
    ],
  },

  // -----------------------------------------------------------------------
  // 2. Resources
  // -----------------------------------------------------------------------
  {
    id: "resource-depletion",
    question: "When do we run out?",
    shortLabel: "Resources",
    preset: "standard-run",
    chartVars: ["nrfr", "fcaor"],
    summary:
      "In the model\u2019s standard run, nonrenewable resources (think fossil fuels, metals, " +
      "minerals) decline steadily and are about 50% depleted by the 2020s. As they get scarce, " +
      "more and more capital is diverted from industry to extraction, which drags down the whole " +
      "economy. The model doesn\u2019t say we literally \u201crun out\u201d \u2014 it says extraction " +
      "becomes so expensive it chokes growth.",
    concepts: [
      {
        term: "What counts as \u201cresources\u201d?",
        definition:
          "Nonrenewable resources in World3 are an aggregate stock representing fossil fuels " +
          "(coal, oil, gas), minerals, and metals. Renewables like solar, wind, and hydro are " +
          "NOT included \u2014 the model was built before renewables were significant. This is " +
          "one of its known limitations.",
      },
      {
        term: "Fraction of capital allocated to obtaining resources (FCAOR)",
        definition:
          "As resources deplete, the economy must spend more capital on extraction (deeper mines, " +
          "harder-to-reach deposits). FCAOR rises from ~5% to over 50%, leaving less capital for " +
          "industry, agriculture, and services. This is the key mechanism that triggers decline.",
      },
    ],
    equations: {
      preamble:
        "Resources are a single stock that depletes at a rate proportional to population " +
        "and per-capita consumption. A technology multiplier can slow depletion.",
      items: [
        {
          label: "Resource depletion",
          html:
            '<span class="eq-frac"><span class="eq-num">d<span class="eq-var">NR</span></span>' +
            '<span class="eq-den">d<span class="eq-var">t</span></span></span> = ' +
            '\u2212<span class="eq-var">NRUR</span>',
        },
        {
          label: "Fraction remaining",
          html:
            '<span class="eq-var">NRFR</span> = ' +
            '<span class="eq-frac"><span class="eq-num"><span class="eq-var">NR</span></span>' +
            '<span class="eq-den"><span class="eq-var">NRI</span></span></span>',
        },
        {
          label: "Usage rate",
          html:
            '<span class="eq-var">NRUR</span> = ' +
            '<span class="eq-var">POP</span> \u00d7 ' +
            '<span class="eq-var">PCRUM</span> \u00d7 ' +
            '<span class="eq-var">NRUF</span>',
        },
      ],
      feedback:
        "This is a balancing loop: fewer resources \u2192 higher FCAOR \u2192 less industrial " +
        "output \u2192 lower consumption rate \u2192 slower depletion. But the economy shrinks " +
        "in the process.",
    },
    constantKeys: ["nri", "nruf1", "nruf2"],
    sources: [
      { text: "Dynamics of Growth in a Finite World, Ch. 5 \u2014 Nonrenewable Resource Sector", url: null },
      { text: "Nebel et al. (2024) recalibration", url: "https://doi.org/10.1111/jiec.13442" },
    ],
  },

  // -----------------------------------------------------------------------
  // 3. Technology
  // -----------------------------------------------------------------------
  {
    id: "technology-rescue",
    question: "Can technology save us?",
    shortLabel: "Technology",
    preset: "compare",
    comparePresets: ["standard-run", "optimistic-technology"],
    chartVars: ["iopc", "pop"],
    summary:
      "The model tests this by comparing the standard run with an optimistic scenario where " +
      "technology improves resource efficiency, pollution control, and agricultural yields from " +
      "1975 onward. Technology helps \u2014 it delays the peak and raises the ceiling \u2014 but " +
      "in most scenarios it doesn\u2019t prevent overshoot on its own. Growth in consumption " +
      "outpaces the gains.",
    concepts: [
      {
        term: "How technology enters the model",
        definition:
          "Technology is modeled through \u201cswitch\u201d constants that flip between two table " +
          "functions at a given year. For example, NRUF switches from table 1 to table 2, " +
          "representing a sudden improvement in resource usage efficiency. This is admittedly " +
          "crude \u2014 real technology adoption is gradual.",
      },
      {
        term: "Switch constants",
        definition:
          "Constants like LFERT, NRUF, PPOLX have two sets of lookup tables. A switch year " +
          "(e.g., pyear_policy_switch = 1975 in optimistic scenarios) determines when the " +
          "model transitions from \u201cbusiness-as-usual\u201d tables to \u201ctechnology-improved\u201d ones.",
      },
    ],
    equations: {
      preamble:
        "Technology enters through multiplier functions that modify resource usage, " +
        "pollution generation, and land yield. The switch year determines when " +
        "improvements begin.",
      items: [
        {
          label: "Resource usage factor (after switch)",
          html:
            '<span class="eq-var">NRUF</span> = ' +
            '<span class="eq-var">NRUF2</span>(<span class="eq-var">t</span>) ' +
            'when <span class="eq-var">t</span> \u2265 <span class="eq-var">t</span><span class="eq-sub">switch</span>',
        },
        {
          label: "Industrial output per capita",
          html:
            '<span class="eq-var">IOPC</span> = ' +
            '<span class="eq-frac"><span class="eq-num"><span class="eq-var">IC</span> \u00d7 ' +
            '(1 \u2212 <span class="eq-var">FCAOR</span>) \u00d7 ' +
            '<span class="eq-var">CUF</span></span>' +
            '<span class="eq-den"><span class="eq-var">ICOR</span> \u00d7 ' +
            '<span class="eq-var">POP</span></span></span>',
        },
      ],
      feedback:
        "Technology creates a balancing loop against depletion and pollution, but population " +
        "and consumption growth create reinforcing loops that can overwhelm the gains. The " +
        "model suggests technology is necessary but not sufficient without demand-side changes.",
    },
    constantKeys: ["nruf1", "nruf2", "icor1", "icor2"],
    requestKeys: ["pyear"],
    sources: [
      { text: "Dynamics of Growth in a Finite World, Ch. 7 \u2014 Policy Scenarios", url: null },
      { text: "Limits to Growth: The 30-Year Update, Ch. 7 \u2014 Technology", url: null },
    ],
  },

  // -----------------------------------------------------------------------
  // 4. Pollution
  // -----------------------------------------------------------------------
  {
    id: "pollution-cost",
    question: "What does pollution really cost?",
    shortLabel: "Pollution",
    preset: "standard-run",
    chartVars: ["ppolx"],
    summary:
      "In the standard run, the pollution index stays low until about 2000, then rises " +
      "exponentially as industrial output peaks. Pollution reduces land fertility (less food) " +
      "and life expectancy (more deaths). By the time pollution peaks, the damage is already " +
      "locked in because persistent pollutants take decades to be absorbed.",
    concepts: [
      {
        term: "Persistent pollution",
        definition:
          "Long-lived pollutants that accumulate in the environment \u2014 heavy metals, " +
          "synthetic chemicals, plastics, and greenhouse gases. The model uses a single " +
          "aggregate index rather than tracking individual substances.",
      },
      {
        term: "Why not climate change?",
        definition:
          "World3 was built in 1972, before climate science was mainstream. It models " +
          "pollution as a generic stock that affects health and agriculture. In validation, " +
          "CO\u2082 concentration serves as the empirical proxy for PPOLX, so climate effects are " +
          "indirectly captured through the pollution index.",
      },
      {
        term: "Absorption delay",
        definition:
          "The environment absorbs pollution over time, but there\u2019s a delay (AHL70 \u2248 " +
          "1.5 years at 1970 levels). As pollution rises, the absorption half-life can grow, " +
          "meaning the environment becomes less able to clean itself \u2014 a dangerous positive " +
          "feedback.",
      },
    ],
    equations: {
      preamble:
        "Persistent pollution accumulates from industrial and agricultural activity " +
        "and is slowly absorbed by the environment. The pollution index (PPOLX) is " +
        "the ratio of current pollution to its 1970 reference level.",
      items: [
        {
          label: "Pollution accumulation",
          html:
            '<span class="eq-frac"><span class="eq-num">d<span class="eq-var">PPOL</span></span>' +
            '<span class="eq-den">d<span class="eq-var">t</span></span></span> = ' +
            '<span class="eq-var">PPGR</span> \u2212 <span class="eq-var">PPASR</span>',
        },
        {
          label: "Pollution index",
          html:
            '<span class="eq-var">PPOLX</span> = ' +
            '<span class="eq-frac"><span class="eq-num"><span class="eq-var">PPOL</span></span>' +
            '<span class="eq-den"><span class="eq-var">PPOL70</span></span></span>',
        },
      ],
      feedback:
        "Rising pollution \u2192 lower land fertility \u2192 less food \u2192 higher mortality " +
        "\u2192 lower population \u2192 less pollution (balancing). But also: rising pollution " +
        "\u2192 longer absorption time \u2192 even more pollution (reinforcing). The reinforcing " +
        "loop dominates during the overshoot phase.",
    },
    constantKeys: ["ppoli", "ppol70", "ahl70", "ppgf1", "ppgf2"],
    sources: [
      { text: "Dynamics of Growth in a Finite World, Ch. 4 \u2014 Pollution Sector", url: null },
      { text: "Nebel et al. (2024) \u2014 CO\u2082 as validation proxy for PPOL", url: "https://doi.org/10.1111/jiec.13442" },
    ],
  },

  // -----------------------------------------------------------------------
  // 5. Food
  // -----------------------------------------------------------------------
  {
    id: "food-enough",
    question: "Is there enough food?",
    shortLabel: "Food",
    preset: "standard-run",
    chartVars: ["fpc", "al"],
    summary:
      "In the standard run, food per capita rises until about 2010, then declines as " +
      "arable land erodes, pollution reduces fertility, and capital is diverted to resource " +
      "extraction. The model doesn\u2019t predict famine for everyone \u2014 it shows that " +
      "the global average drops below the level needed to sustain life expectancy.",
    concepts: [
      {
        term: "Arable land",
        definition:
          "Land suitable for growing crops. In World3, arable land can be developed " +
          "(converted from other uses) or lost to erosion and urban expansion. Once lost, " +
          "it takes a very long time to recover. The initial stock is about 0.9 billion hectares.",
      },
      {
        term: "Land yield",
        definition:
          "How much food is produced per hectare. Depends on agricultural inputs (capital, " +
          "fertilizer) and land fertility. Pollution degrades land fertility over time. " +
          "Technology can increase yield, but with diminishing returns.",
      },
    ],
    equations: {
      preamble:
        "Food production is land yield times arable land, divided by population for " +
        "the per-capita figure. Land yield depends on agricultural inputs and fertility.",
      items: [
        {
          label: "Food per capita",
          html:
            '<span class="eq-var">FPC</span> = ' +
            '<span class="eq-frac"><span class="eq-num"><span class="eq-var">F</span></span>' +
            '<span class="eq-den"><span class="eq-var">POP</span></span></span>',
        },
        {
          label: "Food production",
          html:
            '<span class="eq-var">F</span> = ' +
            '<span class="eq-var">LY</span> \u00d7 ' +
            '<span class="eq-var">AL</span> \u00d7 ' +
            '<span class="eq-var">LFH</span> \u00d7 ' +
            '(1 \u2212 <span class="eq-var">PL</span>)',
        },
        {
          label: "Land yield",
          html:
            '<span class="eq-var">LY</span> = ' +
            '<span class="eq-var">LYN</span> \u00d7 ' +
            '<span class="eq-var">LYMC</span> \u00d7 ' +
            '<span class="eq-var">LYMAP</span>',
        },
      ],
      feedback:
        "More agricultural capital \u2192 higher yield \u2192 more food \u2192 lower mortality " +
        "\u2192 more people \u2192 more capital needed (reinforcing). But pollution degrades " +
        "fertility and arable land erodes, creating balancing loops.",
    },
    constantKeys: ["ali", "pali", "lfh", "sfpc", "fspd", "ifpc1", "ifpc2"],
    sources: [
      { text: "Dynamics of Growth in a Finite World, Ch. 3 \u2014 Agriculture Sector", url: null },
      { text: "Limits to Growth: The 30-Year Update, Ch. 4", url: null },
    ],
  },
];
