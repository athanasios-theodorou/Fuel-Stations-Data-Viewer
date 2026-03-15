const tableBody = document.getElementById("tableBody");
const stationsCount = document.getElementById("stationsCount");
const fuelEntriesCount = document.getElementById("fuelEntriesCount");
const sourceBadge = document.getElementById("sourceBadge");
const tableStatus = document.getElementById("tableStatus");

const searchInput = document.getElementById("searchInput");
const h24Filter = document.getElementById("h24Filter");
const priceSort = document.getElementById("priceSort");
const distanceSort = document.getElementById("distanceSort");

let allRows = [];
let currentSource = "No source loaded";

function escapeHTML(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function updateStats(rows) {
  const uniqueStations = new Set(rows.map((row) => row.stationID));
  stationsCount.textContent = uniqueStations.size;
  fuelEntriesCount.textContent = rows.length;
}

function renderTable(rows) {
  if (!rows.length) {
    tableBody.innerHTML = `
        <tr>
          <td colspan="10" class="empty-state">No matching records found.</td>
        </tr>
      `;

    updateStats([]);
    tableStatus.textContent =
      allRows.length > 0
        ? "No records match the selected search/filter options."
        : "No data available.";
    return;
  }

  tableBody.innerHTML = rows
    .map(
      (row) => `
          <tr>
            <td>${escapeHTML(row.stationID)}</td>
            <td>${escapeHTML(row.distance)}</td>
            <td>${escapeHTML(row.address)}</td>
            <td>
              <span class="status-pill ${row.h24 === "Yes" ? "open" : "closed"}">
                ${escapeHTML(row.h24)}
              </span>
            </td>
            <td>${escapeHTML(row.brand)}</td>
            <td>${escapeHTML(row.phone)}</td>
            <td>${escapeHTML(row.fuelTypeID)}</td>
            <td>${escapeHTML(row.fuelName)}</td>
            <td class="price-cell">${escapeHTML(row.price)}</td>
            <td>${escapeHTML(row.priceTimeStamp)}</td>
          </tr>
        `,
    )
    .join("");

  updateStats(rows);

  const uniqueStations = new Set(rows.map((row) => row.stationID));
  tableStatus.textContent = `Showing ${rows.length} fuel records from ${uniqueStations.size} stations.`;
}

function applyFiltersAndSort() {
  let filteredRows = [...allRows];

  const searchValue = searchInput.value.trim().toLowerCase();
  const h24Value = h24Filter.value;
  const priceSortValue = priceSort.value;
  const distanceSortValue = distanceSort.value;

  if (searchValue) {
    filteredRows = filteredRows.filter((row) => {
      return (
        String(row.brand).toLowerCase().includes(searchValue) ||
        String(row.address).toLowerCase().includes(searchValue) ||
        String(row.fuelName).toLowerCase().includes(searchValue)
      );
    });
  }

  if (h24Value !== "all") {
    filteredRows = filteredRows.filter((row) => row.h24 === h24Value);
  }

  if (priceSortValue !== "none") {
    filteredRows.sort((a, b) => {
      const priceA = parseFloat(a.price);
      const priceB = parseFloat(b.price);

      if (Number.isNaN(priceA) && Number.isNaN(priceB)) return 0;
      if (Number.isNaN(priceA)) return 1;
      if (Number.isNaN(priceB)) return -1;

      return priceSortValue === "asc" ? priceA - priceB : priceB - priceA;
    });
  }

  if (distanceSortValue !== "none") {
    filteredRows.sort((a, b) => {
      const distanceA = parseFloat(a.distance);
      const distanceB = parseFloat(b.distance);

      if (Number.isNaN(distanceA) && Number.isNaN(distanceB)) return 0;
      if (Number.isNaN(distanceA)) return 1;
      if (Number.isNaN(distanceB)) return -1;

      return distanceSortValue === "asc"
        ? distanceA - distanceB
        : distanceB - distanceA;
    });
  }

  renderTable(filteredRows);
}

async function loadXML() {
  try {
    const response = await fetch("data/fuel.xml");
    if (!response.ok) {
      throw new Error("Failed to load XML file.");
    }

    const xmlText = await response.text();
    const parser = new DOMParser();
    const xml = parser.parseFromString(xmlText, "application/xml");

    const parserError = xml.querySelector("parsererror");
    if (parserError) {
      throw new Error("Invalid XML format.");
    }

    const stations = xml.getElementsByTagName("station");
    const rows = [];

    for (let i = 0; i < stations.length; i++) {
      const station = stations[i];
      const gases = station.getElementsByTagName("gas");

      for (let j = 0; j < gases.length; j++) {
        const gas = gases[j];

        rows.push({
          stationID: station.getAttribute("stationID") ?? "-",
          distance:
            station.getElementsByTagName("distance")[0]?.textContent?.trim() ??
            "-",
          address:
            station.getElementsByTagName("address")[0]?.textContent?.trim() ??
            "-",
          h24: station.getAttribute("h24") ?? "-",
          brand:
            station.getElementsByTagName("brand")[0]?.textContent?.trim() ??
            "-",
          phone:
            station.getElementsByTagName("phone")[0]?.textContent?.trim() ??
            "-",
          fuelTypeID: gas.getAttribute("fuelTypeID") ?? "-",
          fuelName: gas.textContent?.trim() ?? "-",
          price: gas.getAttribute("price") ?? "-",
          priceTimeStamp: gas.getAttribute("priceTimeStamp") ?? "-",
        });
      }
    }

    allRows = rows;
    currentSource = "XML";
    sourceBadge.textContent = "XML loaded";
    applyFiltersAndSort();
  } catch (error) {
    allRows = [];
    currentSource = "No source loaded";
    tableBody.innerHTML = `
        <tr>
          <td colspan="10" class="empty-state">Error loading XML data.</td>
        </tr>
      `;
    updateStats([]);
    sourceBadge.textContent = "XML failed";
    tableStatus.textContent = error.message;
  }
}

async function loadJSON() {
  try {
    const response = await fetch("data/fuel.json");
    if (!response.ok) {
      throw new Error("Failed to load JSON file.");
    }

    const data = await response.json();
    const stations = data?.fuel?.fuel_station?.station ?? [];
    const rows = [];

    for (const station of stations) {
      const gases = station?.selling_gas_details?.gas ?? [];

      for (const gas of gases) {
        rows.push({
          stationID: station._stationID ?? "-",
          distance: station.distance ?? "-",
          address: station.address ?? "-",
          h24: station._h24 ?? "-",
          brand: station?.brand?.__text ?? "-",
          phone: station.phone ?? "-",
          fuelTypeID: gas._fuelTypeID ?? "-",
          fuelName: gas.__text ?? "-",
          price: gas._price ?? "-",
          priceTimeStamp: gas._priceTimeStamp ?? "-",
        });
      }
    }

    allRows = rows;
    currentSource = "JSON";
    sourceBadge.textContent = "JSON loaded";
    applyFiltersAndSort();
  } catch (error) {
    allRows = [];
    currentSource = "No source loaded";
    tableBody.innerHTML = `
        <tr>
          <td colspan="10" class="empty-state">Error loading JSON data.</td>
        </tr>
      `;
    updateStats([]);
    sourceBadge.textContent = "JSON failed";
    tableStatus.textContent = error.message;
  }
}

function clearResults() {
  allRows = [];
  currentSource = "No source loaded";

  tableBody.innerHTML = "";
  updateStats([]);
  sourceBadge.textContent = "No source loaded";
  tableStatus.textContent = "Load XML or JSON to display records.";

  searchInput.value = "";
  h24Filter.value = "all";
  priceSort.value = "none";
  distanceSort.value = "none";
}

searchInput.addEventListener("input", applyFiltersAndSort);
h24Filter.addEventListener("change", applyFiltersAndSort);
priceSort.addEventListener("change", applyFiltersAndSort);
distanceSort.addEventListener("change", applyFiltersAndSort);
