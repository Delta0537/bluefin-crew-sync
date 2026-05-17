# PPC-HQ EOB (Electronic Operations Board) — CSV Export

Source: `PPC-HQ_EOB__Electronic_Operations_Board__2026_1_5_26.xlsm`
Export date: 2026-05-17

## What this is

The original file is a multi-sheet operations board for **PPC (a BlueFin/related field-services company)**. It tracks **field personnel** (welders, techs, PMs) assigned to **projects/jobs** (each with a 6-digit FC job number) on a **daily calendar grid**.

The .xlsm had 32 sheets — most were duplicate dated snapshots of the same HQ Projects board. This export consolidates the unique data into clean CSVs.

## Data captured

✅ **Months covered** — Dec 2021, Jan 2022, Feb 2022, Mar 2022, Apr 2022, May 2022, Jul 2023, Aug 2023, Sep 2023 (June 2022 → June 2023 is a gap in the source file)
✅ **Personnel names** — 37+ field personnel with phone, truck, trailer assignments
✅ **Job locations / clients** — full client+project list with FC job numbers
✅ **Daily assignments** — who worked which job each day (1 = assigned, blank = not assigned, H = home, PTO = time off)
✅ **Project metadata** — PM name, status, expected start/end, comments history

---

## File index

### Daily Assignment Grids (Personnel × Date)

Each `*_assignments.csv` is a matrix:
- **Rows** = personnel name
- **Columns** = each day of that month (YYYY-MM-DD)
- **Cell values** = job/FC number the person was assigned to, OR `1` (assigned-flag), `H` (home), `PTO`, etc.

| File | Period | Personnel | Days |
|------|--------|-----------|------|
| `December_2021_assignments.csv` | Dec 2021 | 53 | 31 |
| `January_2022_assignments.csv` | Jan 2022 | 54 | 31 |
| `February_2022_assignments.csv` | Feb 2022 | 51 | 28 |
| `March_2022_assignments.csv` | Mar 2022 | 36 | 31 |
| `April_2022_assignments.csv` | Apr 2022 | 29 | 30 |
| `May_2022_assignments.csv` | May 2022 | 34 | 31 |
| `July_2023_assignments.csv` | **Jul 2023** | 37 | 31 |
| `August_2023_assignments.csv` | **Aug 2023** | 39 | 30 |
| `September_2023_assignments.csv` | **Sep 2023** | 41 | 30 |

### Project Lists (per month)

Each `*_projects.csv` lists the active projects for that month:
- `Job_Number` — 6-digit FC number (e.g., 204861)
- `Job_Name_Location` — client + scope (e.g., "Shintech", "JSM Pipe flush", "New Fortress LNG commissioning")
- `Num_Personnel` — headcount needed
- `Duration_Days` — expected duration

### Master / Cross-cutting Files

| File | Description | Rows |
|------|-------------|------|
| `HQ_Projects_Master_3.16.22.csv` | **Master project board** — every project ever tracked with status, PM, comments history | 55 projects |
| `Personnel_Roster.csv` | **Contact roster** — Name, Phone, Truck #, Trailer # | 37 people |
| `Personnel_Master_List.csv` | **Org structure** — every person categorized: Field Personnel, Engineers/PMs, Borrowed Help, RP (River Parish), PMs, Shop/Estimating | 45 entries |
| `Projects_Needs_Snapshot.csv` | Snapshot of active projects + headcount needs from the personnel sheet | 22 projects |

---

## HQ_Projects_Master_3.16.22.csv schema

This is the **most important file** — the master project log.

| Column | Description |
|--------|-------------|
| `FC_Number` | 6-digit FC job number |
| `Status` | Bidding / Upcoming / Ongoing / Returned-Invoicing / Lost Work / Other |
| `Client_Project` | Client name + project shorthand |
| `Job_Description` | Scope of work |
| `Expected_Start_End` | Date or month |
| `PM` | Project manager initials/name |
| `Trucks` | Truck assignments |
| `Trailers` | Trailer assignments |
| `New_Comments` | Latest status notes |
| `Previous_Comments_1` / `_2` | Comment history (dates inside the text show progression) |

Comment fields had embedded newlines — those were replaced with ` | ` so the CSV stays one-row-per-project.

---

## Status values seen in the master sheet

- `Bidding Projects by Operations Group`
- `Cross Utilization of Personnel`
- `Lost Work`
- `Ongoing Project`
- `Other Work`
- `Projects Returned - Invoicing Stage`
- `Upcoming Project`

## Legend from the source file

- **PPC** = Pickling, Passivating and Cleaning division (Mike D.)
- **RP** = River Parish project
- **US** = Umbilical Services project
- Color-coded job number cells in the original correlated to a schedule (color info lost in CSV — need to look at original .xlsm for color context if it matters)

---

## Known gaps / data quality notes

1. **June 2022 → June 2023 missing** — source file has no data for that 12-month window
2. **Source sheet labels are stale** — the rightmost month blocks are labeled "May / July / August / September" but the actual dates in those columns are **2023**, not 2022. Filenames here reflect the *actual dates* in the cells.
3. **Trucks sheet** had only headers, no truck inventory rows filled in
4. **Schedule sheet** is empty
5. The `Sheet2` tab in the source was an incomplete June 2021 fragment — excluded from export
6. The roster's phone numbers may be outdated (sheet is from late 2020 / early 2021 timeframe based on context, even though dates in PPC Personnel-Jobs go to Sept 2023)
