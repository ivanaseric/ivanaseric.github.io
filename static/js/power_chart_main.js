import {get_data} from "./csv_data.js";
import {power_chart} from "./power_chart.js"

async function chartResize() {
    const data_js = get_data();
    var chartDiv = document.getElementById("wrapper");
    var width = chartDiv.clientWidth;
    power_chart("#wrapper", {"width": width, dataset: data_js})
}

await chartResize();
window.addEventListener('resize', chartResize);