/**
 * Math explainer content for each chart group.
 * Keyed by base chart ID (without view prefixes like cmp- or adv-).
 */

/* exported MATH_EXPLAINERS */
const MATH_EXPLAINERS = {
  "chart-pop": {
    plain:
      "Total population is the sum of four age cohorts (0\u201314, 15\u201344, 45\u201364, 65+). " +
      "Each cohort gains people from the one below (maturation) and loses them to death or " +
      "the next cohort. Life expectancy starts from a base value and is multiplied by factors " +
      "for food, health services, pollution, and crowding.",
    equations: [
      {
        label: "Total population",
        html:
          '<span class="eq-var">POP</span> = ' +
          '<span class="eq-var">P1</span> + <span class="eq-var">P2</span> + ' +
          '<span class="eq-var">P3</span> + <span class="eq-var">P4</span>',
      },
      {
        label: "Cohort rate (example: ages 0\u201314)",
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
    variables: ["pop", "le"],
  },

  "chart-econ": {
    plain:
      "Industrial output depends on industrial capital, how much capital is diverted " +
      "to agriculture, capacity utilization, and the capital-output ratio. Food production " +
      "is land yield times arable land times land fertility, adjusted by a pollution factor. " +
      "Both are divided by population to get per-capita values.",
    equations: [
      {
        label: "Industrial output",
        html:
          '<span class="eq-var">IO</span> = ' +
          '<span class="eq-frac"><span class="eq-num"><span class="eq-var">IC</span> \u00d7 ' +
          '(1 \u2212 <span class="eq-var">FCAOR</span>) \u00d7 ' +
          '<span class="eq-var">CUF</span></span>' +
          '<span class="eq-den"><span class="eq-var">ICOR</span></span></span>',
      },
      {
        label: "Industrial output per capita",
        html:
          '<span class="eq-var">IOPC</span> = ' +
          '<span class="eq-frac"><span class="eq-num"><span class="eq-var">IO</span></span>' +
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
        label: "Food per capita",
        html:
          '<span class="eq-var">FPC</span> = ' +
          '<span class="eq-frac"><span class="eq-num"><span class="eq-var">F</span></span>' +
          '<span class="eq-den"><span class="eq-var">POP</span></span></span>',
      },
    ],
    variables: ["iopc", "fpc"],
  },

  "chart-poll": {
    plain:
      "Persistent pollution accumulates from industrial and agricultural sources " +
      "and is slowly absorbed by the environment. The pollution index (PPOLX) is " +
      "the ratio of current pollution to its 1970 reference level. When pollution " +
      "rises faster than absorption, it compounds \u2014 reducing land fertility and life expectancy.",
    equations: [
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
    variables: ["ppolx"],
  },

  "chart-res": {
    plain:
      "Nonrenewable resources deplete as population consumes them. The usage rate " +
      "depends on population, per-capita resource usage, and a usage-efficiency multiplier " +
      "that improves with technology. The fraction remaining (NRFR) feeds back into the " +
      "economy by shifting capital allocation away from industry (via FCAOR).",
    equations: [
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
    variables: ["nrfr"],
  },
};
