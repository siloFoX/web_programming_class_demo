var sleep = (ms) => {
    const wakeupTime = Date.now() + ms;
    while (Date.now() < wakeupTime) {}
}

var selectOnChange = (value, length) => {
    for (i = 0; i < length; i++ ) 
        document.getElementById("row-" + String(i+1)).style.display= "none";
    
    var row_each = document.getElementById('row-' + value);
    
    row_each.style.display = "table-row";
    document.getElementById('delDev-' + value).checked = true;

    if(value == 1) {
        document.getElementById('cocoImg').style.display = "grid";
        document.getElementById('maskImg').style.display = "none";
        document.getElementById('ppeImg').style.display = "none";
    } else if(value == 2) {
        document.getElementById('cocoImg').style.display = "none";
        document.getElementById('maskImg').style.display = "grid";
        document.getElementById('ppeImg').style.display = "none";
    } else if(value == 3) {
        document.getElementById('cocoImg').style.display = "none";
        document.getElementById('maskImg').style.display = "none";
        document.getElementById('ppeImg').style.display = "grid";
    }
}

// var showClassDescription = () => {
//     var classDescription = document.getElementById("class-description");
//     classDescription.style.display = "block";
// }

// var disappearClassDescription = () => {
//     var classDescription = document.getElementById("class-description");
//     classDescription.style.display = "none";
// }

// var changeClassDescription = (desc) => {
//     var classDescription = document.getElementById("class-description")
//     classDescription.innerHTML = "<p>" + desc + " class description with icons</p>"
// }

// window.onload = () => {
//     selectOnChange(1, 1);
// }