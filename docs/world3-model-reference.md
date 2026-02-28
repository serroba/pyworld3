# World3 Model Reference

Mathematical and domain reference for the PyWorld3 simulation, for use in validating and testing model behaviour.

---

## Acknowledgements

### Original World3 Model

The World3 model was created by **Donella H. Meadows, Dennis L. Meadows, Jørgen Randers, and William W. Behrens III** as part of the *Limits to Growth* study for the Club of Rome (1972). The full technical description was published in:

> Meadows, D. L., Behrens, W. W., Meadows, D. H., Naill, R. F., Randers, J., & Zahn, E. K. O. (1974). *Dynamics of Growth in a Finite World*. Wright-Allen Press Inc.

The model was updated to World3-03 in:

> Meadows, D. H., Randers, J., & Meadows, D. L. (2005). *Limits to Growth: The 30-Year Update*. Earthscan.

### PyWorld3

This Python implementation of World3 was created by **Charles Vanwynsberghe**:

> Vanwynsberghe, C. (2021). PyWorld3 — The World3 model revisited in Python. [hal-03414394](https://hal.archives-ouvertes.fr/hal-03414394)

### Recalibration (Nebel et al., 2024)

The recalibration data and methodology referenced in this document come from:

> Nebel, A., Kling, A., Willamowski, R., & Schell, T. (2024). Recalibration of limits to growth: An update of the World3 model. *Journal of Industrial Ecology*, 28, 87–99. DOI: [10.1111/jiec.13442](https://onlinelibrary.wiley.com/doi/epdf/10.1111/jiec.13442)

Their updated PyWorld3-03 implementation is available at [github.com/TimSchell98/PyWorld3-03](https://github.com/TimSchell98/PyWorld3-03).

---

## 1. Model Architecture

World3 is a **system dynamics** model with **5 interrelated sectors**, two main positive feedback loops driving exponential growth, and multiple limiting (negative) feedback loops.

### Positive feedback loops
1. **Population**: larger population $\rightarrow$ higher birth rate (with 15-30 year delay)
2. **Capital**: higher investment $\rightarrow$ more industrial capital $\rightarrow$ higher investment capacity

### Sectors and state variables

| Sector | State Variables | PyWorld3 Module |
|---|---|---|
| Population | $P_1, P_2, P_3, P_4$ (age cohorts 0-14, 15-44, 45-64, 65+) | `population.py` |
| Capital | $IC$ (industrial capital), $SC$ (service capital) | `capital.py` |
| Agriculture | $AL$ (arable land), $PAL$ (potentially arable land), $UIL$ (urban-industrial land), $LFERT$ (land fertility) | `agriculture.py` |
| Pollution | $PPOL$ (persistent pollution) | `pollution.py` |
| Non-renewable Resources | $NR$ (nonrenewable resources remaining) | `resource.py` |

Total system: **12 state variables**, raised to **29th order** with internal delay functions.

---

## 2. Core Equations

All sectors follow the general ODE form:

$$\frac{dx}{dt} = \text{inflow}(t) - \text{outflow}(t)$$

### 2.1 Population Sector

Four age cohorts with maturation, birth, and death flows:

$$\frac{dP_1}{dt} = B - D_1 - \text{Mat}_1 \qquad \text{(ages 0–14)}$$

$$\frac{dP_2}{dt} = \text{Mat}_1 - D_2 - \text{Mat}_2 \qquad \text{(ages 15–44)}$$

$$\frac{dP_3}{dt} = \text{Mat}_2 - D_3 - \text{Mat}_3 \qquad \text{(ages 45–64)}$$

$$\frac{dP_4}{dt} = \text{Mat}_3 - D_4 \qquad \text{(ages 65+)}$$

$$POP = P_1 + P_2 + P_3 + P_4$$

Where $B$ = births/year, $D_i$ = deaths in cohort $i$, $\text{Mat}_i$ = maturation out of cohort $i$.

**Birth rate**:

$$B = POP \cdot CBR$$

$$TF = \min\bigl(MTF,\; MTF \cdot (1 - FCE) + DTF \cdot FCE\bigr)$$

- $TF$ = total fertility
- $MTF$ = maximum total fertility (affected by $FPC$, $IOPC$)
- $DTF$ = desired total fertility
- $FCE$ = fertility control effectiveness
- $DCFS$ = desired completed family size (affected by income, services)

**Death rate**:

$$D_i = P_i \cdot m_i$$

$$LE = LE_N \cdot LMF \cdot LMHS \cdot LMP \cdot LMC$$

- $LE$ = life expectancy
- $LE_N$ = life expectancy normal (28 years baseline)
- $LMF$ = life expectancy multiplier from food (table fn of $FPC$)
- $LMHS$ = multiplier from health services (table fn of $EHSPC$)
- $LMP$ = multiplier from pollution (table fn of $PPOLX$)
- $LMC$ = multiplier from crowding (table fn of crowding ratio)

### 2.2 Capital Sector

**Industrial capital**:

$$\frac{dIC}{dt} = ICIR - ICDR$$

$$ICIR = IO \cdot FIOAI$$

$$ICDR = \frac{IC}{ALIC}$$

$$IO = \frac{IC \cdot (1 - FCAOR)}{ICOR}$$

$$IOPC = \frac{IO}{POP}$$

**Service capital**:

$$\frac{dSC}{dt} = SCIR - SCDR$$

$$SCIR = IO \cdot FIOAS$$

$$SCDR = \frac{SC}{ALSC}$$

$$SOPC = \frac{SO}{POP}$$

**Key allocation identity** (fractions of industrial output):

$$FIOAA + FIOAI + FIOAS + FIOAC = 1$$

- $FIOAA$ = fraction to agriculture
- $FIOAI$ = fraction to industrial investment
- $FIOAS$ = fraction to services
- $FIOAC$ = fraction to consumption

### 2.3 Agriculture Sector

**Arable land dynamics**:

$$\frac{dAL}{dt} = LDR - LER - LRUI$$

$$\frac{dPAL}{dt} = -LDR$$

$$\frac{dUIL}{dt} = LRUI$$

- $LDR$ = land development rate
- $LER = \dfrac{AL}{ALL}$ (arable land / avg life of land)
- $LRUI$ = land removed for urban-industrial use

**Food production**:

$$F = LY \cdot AL \cdot LFH \cdot (1 - PL)$$

$$FPC = \frac{F}{POP}$$

- $LY$ = land yield (kg/ha/yr), affected by fertilizer inputs, pollution, land fertility
- $LFH$ = land fraction harvested ($0.7$)
- $PL$ = processing loss ($0.1$)

**Land yield**:

$$LY = LY_N \cdot LYMC \cdot LYMAP \cdot LYF$$

- $LY_N$ = land yield normal
- $LYMC$ = yield multiplier from crowding
- $LYMAP$ = yield multiplier from air pollution
- $LYF$ = yield multiplier from fertilizer (table fn of per-hectare input)

**Land fertility**:

$$\frac{dLFERT}{dt} = LFR - LFD$$

- $LFR$ = land fertility regeneration
- $LFD$ = land fertility degradation (driven by $PPOLX$)

### 2.4 Persistent Pollution Sector

$$\frac{dPPOL}{dt} = PPGR - PPASR$$

$$PPGR = (PPGIO + PPGAO) \cdot PPGF$$

$$PPASR = \frac{PPOL}{AHL}$$

- $PPGR$ = pollution generation rate
- $PPASR$ = pollution assimilation rate
- $PPGIO = IO \cdot IMTI \cdot IMEF \cdot FRPM$ (pollution from industrial output)
- $PPGAO = \text{ag\_inputs} \cdot AMTI \cdot FAIPM$ (pollution from agricultural output)
- $PPGF$ = pollution generation factor (technology modifier)
- $AHL$ = assimilation half-life (increases with pollution level)

**Pollution index** (key cross-sector coupling variable):

$$PPOLX = \frac{PPOL}{PPOL_{70}}$$

where $PPOL_{70}$ = pollution level in 1970 (reference normalization).

**Transmission delay**: pollution appears in environment after $PPTD$ years (persistent pollution transmission delay). This is implemented as a 3rd-order delay.

### 2.5 Non-renewable Resources Sector

$$\frac{dNR}{dt} = -NRUR$$

$$NRUR = POP \cdot PCRUM \cdot NRUF$$

$$NRFR = \frac{NR}{NR_I}$$

- $NRUR$ = nonrenewable resource usage rate
- $PCRUM$ = per capita resource usage multiplier (table fn of $IOPC$)
- $NRUF$ = nonrenewable resource usage factor (technology modifier)
- $NRFR$ = fraction remaining ($0$ to $1$)
- $NR_I$ = initial resource amount

**Capital allocation feedback**:

$$FCAOR = f(NRFR) \qquad \text{(table function)}$$

As resources deplete ($NRFR \to 0$), more capital is diverted to resource extraction ($FCAOR$ increases), reducing industrial output available for other uses.

---

## 3. Cross-Sector Coupling

The sectors are coupled through shared variables. Key feedback paths:

| From | To | Via | Effect |
|---|---|---|---|
| Capital | Population | $IOPC \to DCFS, LE$ | Higher income $\to$ lower desired family size, higher $LE$ |
| Capital | Agriculture | $FIOAA \cdot IO$ | Industrial investment in agriculture |
| Capital | Pollution | $IO \to PPGIO$ | Industrial output generates pollution |
| Capital | Resources | $NRUR, FCAOR$ | Industry uses resources; depletion diverts capital |
| Agriculture | Population | $FPC \to LMF$ | Food per capita affects life expectancy |
| Agriculture | Pollution | Ag inputs $\to PPGAO$ | Fertilizer/pesticides generate pollution |
| Pollution | Population | $PPOLX \to LMP$ | Pollution reduces life expectancy |
| Pollution | Agriculture | $PPOLX \to LYMAP, LFD$ | Pollution reduces yield and degrades fertility |
| Resources | Capital | $FCAOR \to IO$ | Resource depletion reduces effective industrial output |
| Population | Capital | $POP \to$ labor, demand | Population drives labor force and consumption |
| Population | Agriculture | $POP \to$ food demand | Population drives food per capita |

---

## 4. Delay Functions

Three types used throughout the model (implemented in `specials.py`):

| Type | Order | Usage |
|---|---|---|
| **Smooth** | 1st-order exponential | HSAPC, IOPC perception delays |
| **Dlinf3** | 3rd-order information delay | Lifetime perception, food shortage perception |
| **Delay3** | 3rd-order material delay | Pollution transmission, capital aging |

**1st-order smooth**:

$$\frac{dS}{dt} = \frac{\text{input}(t) - S}{\tau}$$

where $\tau$ is the delay time.

**3rd-order delay** (Delay3): pipeline of three 1st-order stages, each with delay time $\tau / 3$:

$$\frac{dS_i}{dt} = \frac{S_{i-1} - S_i}{\tau / 3} \qquad i = 1, 2, 3$$

Output is $S_3$. Total mean delay is $\tau$.

---

## 5. Nonlinear Table Functions

Over **100 lookup tables** define nonlinear relationships (stored in `functions_table_world3.json`). They use **linear interpolation** between defined points. Critical ones include:

| Table Function | Input | Output | Domain |
|---|---|---|---|
| $LMF$ (life mult. from food) | $FPC / SFPC$ | multiplier on $LE$ | Population |
| $LMP$ (life mult. from pollution) | $PPOLX$ | multiplier on $LE$ | Population |
| $LMHS$ (life mult. from health) | $EHSPC$ | multiplier on $LE$ | Population |
| $FCAOR$ (frac. capital to resources) | $NRFR$ | fraction | Resources/Capital |
| $LYMC$ (yield mult. from crowding) | crowding | multiplier on $LY$ | Agriculture |
| $LYMAP$ (yield mult. from pollution) | $PPOLX$ | multiplier on $LY$ | Agriculture |
| $AHL$ (assimilation half-life) | $PPOLX$ | years | Pollution |
| $PCRUM$ (per cap resource use mult.) | $IOPC$ | multiplier | Resources |
| $DCFS$ (desired family size) | various | children | Population |

---

## 6. Key Model Constants

### Default values (BAU scenario)

| Parameter | Full Name | Default | Unit |
|---|---|---|---|
| **Population** | | | |
| `p1i` | Initial population 0-14 | $6.5 \times 10^8$ | people |
| `p2i` | Initial population 15-44 | $7.0 \times 10^8$ | people |
| `p3i` | Initial population 45-64 | $1.9 \times 10^8$ | people |
| `p4i` | Initial population 65+ | $6.0 \times 10^7$ | people |
| `dcfsn` | Desired completed family size normal | $4.0$ | children |
| `len` | Life expectancy normal | $28$ | years |
| `hsid` | Health services impact delay | $20$ | years |
| `lpd` | Lifetime perception delay | $20$ | years |
| `mtfn` | Maximum total fertility normal | $12$ | children |
| **Capital** | | | |
| `ici` | Initial industrial capital | $2.1 \times 10^{11}$ | \$ |
| `sci` | Initial service capital | $1.44 \times 10^{11}$ | \$ |
| `icor1` | Industrial capital-output ratio 1 | $3$ | years |
| `alic1` | Avg lifetime industrial capital 1 | $14$ | years |
| `alsc1` | Avg lifetime service capital 1 | $20$ | years |
| `lfpf` | Labor force participation fraction | $0.75$ | - |
| `ieat` | Income expectation averaging time | $3$ | years |
| **Agriculture** | | | |
| `ali` | Initial arable land | $0.9 \times 10^9$ | ha |
| `pali` | Initial potentially arable land | $2.3 \times 10^9$ | ha |
| `alln` | Average life of land normal | $1000$ | years |
| `lfh` | Land fraction harvested | $0.7$ | - |
| `pl` | Processing loss | $0.1$ | - |
| `io70` | Industrial output in 1970 | $7.9 \times 10^{11}$ | \$/yr |
| `sfpc` | Subsistence food per capita | $230$ | kg/yr |
| `sd` | Social discount | $0.07$ | - |
| `uildt` | Urban-industrial land dev. time | $10$ | years |
| **Pollution** | | | |
| `ppoli` | Initial persistent pollution | $2.5 \times 10^7$ | pollution units |
| `ppol70` | Pollution level in 1970 | $1.36 \times 10^8$ | pollution units |
| `ahl70` | Assimilation half-life in 1970 | $1.5$ | years |
| `pptd` | Persistent pollution transmission delay | $20$ | years |
| `imti` | Industrial material toxicity index | $10$ | - |
| `imef` | Industrial material emission factor | $0.1$ | - |
| `amti` | Agricultural material toxicity index | $1$ | - |
| `ppgf1` | Persistent pollution gen. factor 1 | $1.0$ | - |
| `frpm` | Frac. resource util. on pollution gen. | $0.02$ | - |
| **Resources** | | | |
| `nri` | Initial nonrenewable resources | $1.0 \times 10^{12}$ | resource units |

---

## 7. Recalibration23 Parameter Changes

Nebel et al. (2024) recalibrated 35 parameters against empirical data (1970-2020). Parameters with the largest changes:

| Parameter | Full Name | Default | Recalibrated | Change |
|---|---|---|---|---|
| `alic1` | Avg lifetime industrial capital 1 | $2.00$ | $15.24$ | $+662\%$ |
| `pptd` | Persistent pollution transmission delay | $20.00$ | $116.38$ | $+482\%$ |
| `hsid` | Health services impact delay | $20.00$ | $38.24$ | $+91\%$ |
| `lpd` | Lifetime perception delay | $20.00$ | $33.84$ | $+69\%$ |
| `ppgf1` | Persistent pollution gen. factor 1 | $1.00$ | $1.53$ | $+53\%$ |
| `lfpf` | Labor force participation fraction | $0.75$ | $1.02$ | $+36\%$ |
| `alln` | Average life of land normal | $1000$ | $1351.20$ | $+35\%$ |
| `palt` | Potentially arable land total | $3.20 \times 10^9$ | $4.22 \times 10^9$ | $+32\%$ |
| `nri` | Non-renewable resources initial | $1.00 \times 10^{12}$ | $1.30 \times 10^{12}$ | $+30\%$ |
| `imti` | Industrial material toxicity index | $10.00$ | $11.06$ | $+11\%$ |
| `imef` | Industrial material emission factor | $0.10$ | $0.11$ | $+10\%$ |
| `sd` | Social discount | $0.07$ | $0.06$ | $-14\%$ |
| `mtfn` | Maximum total fertility normal | $12.00$ | $9.45$ | $-21\%$ |
| `amti` | Agricultural material toxicity index | $1.00$ | $0.77$ | $-23\%$ |
| `sad` | Social adjustment delay | $20.00$ | $13.38$ | $-33\%$ |
| `fspd` | Food shortage perception delay | $2.00$ | $0.61$ | $-69\%$ |
| `uildt` | Urban-industrial land dev. time | $10.00$ | $0.53$ | $-95\%$ |

**Key implications**:
- Industrial capital lasts much longer than originally modeled ($15$ vs $2$ yrs)
- Pollution effects are significantly delayed ($116$ vs $20$ yr transmission)
- Collapse mode remains (overshoot & collapse due to resource depletion, not pollution)
- Peaks of most variables shift a few years into the future with higher magnitudes

---

## 8. Validation Methodology

### NRMSD (Normalized Root Mean Square Deviation)

Used to compare model data ($MD$) to empirical data ($ED$):

$$NRMSD = \frac{\sqrt{\dfrac{1}{N} \displaystyle\sum_{t=0}^{N} \left( MD_{1970+t} - ED_{1970+t} \right)^2}}{\dfrac{1}{N} \displaystyle\sum_{t=0}^{N} ED_{1970+t}}$$

### Change Rate method

For variables where units differ between model and empirical data (IO, food, pollution, resources, services):

$$CR_t = \frac{ED_t - ED_{t-1}}{ED_{t-1}}$$

Compare model and empirical change rates rather than absolute values.

### Sector weights in total NRMSD

| Sector | Weight $w_i$ | Rationale |
|---|---|---|
| Population | $1.0$ | Direct measurement available |
| Food per capita | $0.7$ | Good proxy (kcal $\to$ veg equiv.) |
| Human welfare | $0.7$ | Direct HDI comparison |
| Ecological footprint | $0.7$ | Direct comparison |
| Industrial output | $0.5$ | Index proxy (IIP) |
| Pollution | $0.5$ | CO$_2$ proxy only |
| Non-renewable resources | $0.5$ | Fossil fuel proxy |
| Service per capita | $0.5$ | Education index proxy |

### Empirical data proxies

| Model Variable | Empirical Proxy | Source |
|---|---|---|
| Population ($POP$) | World population | World Bank |
| Industrial output ($IO$) | Index of Industrial Production | UNIDO |
| Food per capita ($FPC$) | kcal/person/day ($3500$ kcal/kg conversion) | FAO |
| Pollution ($PPOL$) | Global CO$_2$ concentration (ppm) | NOAA |
| Non-renewable resources ($NR$) | Fossil fuel consumption | Our World in Data |
| Service per capita ($SOPC$) | Education index | UNDP |
| Human welfare ($HWI$) | Human Development Index | UNDP |
| Ecological footprint ($EF$) | National Footprint Accounts | Global Footprint Network |

---

## 9. Numerical Integration

- **Method**: Backward Euler (implicit, stable for stiff systems)
- **Default timestep**: $\Delta t = 0.5$ years
- **Simulation period**: 1900-2100

The discrete update at each step $k$ follows:

$$x_{k+1} = x_k + \Delta t \cdot f(x_{k+1}, t_{k+1})$$

The integration loop updates all sector variables at each timestep, respecting dependency ordering via the `@requires` decorator system.

---

## 10. Scenario Definitions

| Scenario | $NR_I$ | Key Differences |
|---|---|---|
| **BAU** | $1.0 \times 10^{12}$ | Standard run; collapse from resource depletion $\sim$2030 |
| **BAU2** | $2.0 \times 10^{12}$ | Double resources + recycling; collapse from pollution |
| **CT** | — | Comprehensive technology; reduced pollution, higher yields |
| **SW** | — | Stabilized world; only scenario without overshoot & collapse |
| **Recalibration23** | $1.3 \times 10^{12}$ | Updated params; collapse from resources, peaks shifted later/higher |