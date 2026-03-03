import {get_data} from "./csv_data.js";
import {power_chart, power_chart_axis, power_chart_area, power_chart_line} from "./power_chart.js"

async function chartResize() {
    const data_js = get_data();
    var chartDiv = document.getElementById("wrapper");
    var width = chartDiv.clientWidth;
    power_chart("#wrapper", {"width": width, dataset: data_js})
    power_chart_axis("#chart_axis", {"width": width, dataset: data_js})
    power_chart_area("#chart_area", {"width": width, dataset: data_js})
    power_chart_line("#chart_line", {"width": width, dataset: data_js})
}

// first render
await chartResize();

window.addEventListener('resize', chartResize);