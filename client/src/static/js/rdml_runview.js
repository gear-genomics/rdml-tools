"use strict";

const API_URL = process.env.API_URL
const API_LINK = process.env.API_LINK

const resultLink = document.getElementById('uuid-link-box')

const submitButton = document.getElementById('btn-submit')
submitButton.addEventListener('click', showUpload)

const exampleButton = document.getElementById('btn-example')
exampleButton.addEventListener('click', showExample)

// const jsDebugButton = document.getElementById('btn-jsDebug')
// jsDebugButton.addEventListener('click', jsDebugFunction)

function jsDebugFunction() {
    alert("Ready to debug")
    updateClientData()
}


const inputFile = document.getElementById('inputFile')
const resultInfo = document.getElementById('result-info')
const resultError = document.getElementById('result-error')

const selectorsData = document.getElementById('selectors-data')
const plateData = document.getElementById('plate-data')
const curvesData = document.getElementById('curves-data')

window.minLogCutoff = 0.01;

window.uuid = "";
window.rdmlData = "";
window.reactData = "";
window.isvalid = "untested";

window.selExperiment = "";
window.selRun = "";
window.selRunOnLoad = "";

window.dyeType = "pos"
window.dyeSel = 0
window.yScale = "lin"
window.curveSource = "adp"
window.colorStyle = "tarsam"

window.tarToDye = {}
window.tarToNr = {}
window.samToNr = {}
window.samToType = {}

window.lastSelReact = ""

// Global Values
window.winXst = 0;
window.winXend = 75;
window.winYst = 0;
window.winYend = 5000;
window.frameXst = 0;
window.frameXend = 500;
window.frameYst = 0;
window.frameYend = 300;

function resetAllGlobalVal() {
    window.editMode = false;
    window.editType = "";
    window.editIsNew = false;
    window.editNumber = -1;
}

document.addEventListener("DOMContentLoaded", function() {
    checkForUUID();
});


function saveUndef(tst) {
    if (tst) {
        return tst
    } else {
        return ""
    }
}

function saveUndefKey(base, key) {
    if (base) {
        if(base.hasOwnProperty(key)) {
            return base[key]
        }
    }
    return ""
}

function saveUndefKeyKey(base, key, skey) {
    if (base) {
        if(base.hasOwnProperty(key)) {
            if(base[key].hasOwnProperty(skey)) {
                return base[key][skey]
            }
        }
    }
    return ""
}

function htmllize(tst) {
    tst = tst.replace(/\n/g, "<br />")

    return tst
}

function niceSampleType(txt) {
    if (txt == "ref") {
        return "ref - reference target"
    }
    if (txt == "toi") {
        return "toi - target of interest"
    }
    return txt
}

function niceTargetType(txt) {
    if (txt == "unkn") {
        return "unkn - unknown sample"
    }
    if (txt == "ntc") {
        return "ntc - non template control"
    }
    if (txt == "nac") {
        return "nac - no amplification control"
    }
    if (txt == "std") {
        return "std - standard sample"
    }
    if (txt == "ntp") {
        return "ntp - no target present"
    }
    if (txt == "nrt") {
        return "nrt - minusRT"
    }
    if (txt == "pos") {
        return "pos - positive control"
    }
    if (txt == "opt") {
        return "opt - optical calibrator sample"
    }
    return txt
}

function getSaveHtmlData(key) {
    var el = document.getElementById(key)
    if (el) {
        return el.value
    } else {
        return ""
    }
}

function checkForUUID() {
    var uuid = ""
    var tab = ""
    var vExp = ""
    var vRun = ""

    var path = (window.location.search + "").replace(/^\?/, "") // .pathname decodeURIComponent(;
    path = path.replace(/&/g, ";")
    var allPairs = path.split(";")
    for (var i = 0 ; i < allPairs.length ; i++) {
        var pair = allPairs[i].split("=")
        var pKey = decodeURIComponent(pair[0])
        var pVal = ""
        if (pair.length > 1) {
            pVal = decodeURIComponent(pair[1])
        }
        if (pKey == "UUID") {
            uuid = pVal
        }
        if (pKey == "TAB") {
            tab = pVal
        }
        if (pKey == "EXP") {
            vExp = pVal
        }
        if (pKey == "RUN") {
            vRun = pVal
        }
    }
    if (tab != "") {
        $('[href="#' + tab + '"]').tab('show')
    }
    if (vExp != "") {
        window.selExperiment = vExp
        if (vRun != "") {
            window.selRunOnLoad = vRun
        }
    }
    if (uuid != "") {
        updateServerData(uuid, '{"mode": "upload", "validate": true}')
    }
}

$('#mainTab a').on('click', function(e) {
    e.preventDefault()
    $(this).tab('show')
})

function showExample() {
    updateServerData("example", '{"mode": "upload", "validate": true}')
}

function showUpload() {
    updateServerData("data", '{"mode": "upload", "validate": true}')
}

// TODO client-side validation
function updateServerData(stat, reqData) {
    const formData = new FormData()
    if (stat == "example") {
        formData.append('showExample', 'showExample')
    } else if (stat == "data") {
        formData.append('queryFile', inputFile.files[0])
    } else {
        formData.append('uuid', stat)
    }
    formData.append('reqData', reqData)

    hideElement(resultError)
    showElement(resultInfo)

    axios
        .post(`${API_URL}/data`, formData)
        .then(res => {
	        if (res.status === 200) {
                resetAllGlobalVal()
                window.rdmlData = res.data.data.filedata
                window.uuid = res.data.data.uuid
                if (res.data.data.hasOwnProperty("reactsdata")) {
                    window.reactData = res.data.data.reactsdata
                } else {
                    window.reactData = ""
                }
                if (res.data.data.hasOwnProperty("isvalid")) {
                    if (res.data.data.isvalid) {
                        window.isvalid = "valid"
                    } else {
                        window.isvalid = "invalid"
                    }
                } else {
                    window.isvalid = "untested"
                }
                hideElement(resultInfo)
                if (res.data.data.hasOwnProperty("error")) {
                    showElement(resultError)
                    var err = '<i class="fas fa-fire"></i>\n<span id="error-message">'
                    err += res.data.data.error + '</span>'
                    resultError.innerHTML = err
                } else {
                    hideElement(resultError)
                }
                fillLookupDics()
                updateClientData()
            }
        })
        .catch(err => {
            let errorMessage = err
            if (err.response) {
                errorMessage = err.response.data.errors
               .map(error => error.title)
               .join('; ')
            }
            hideElement(resultInfo)
            showElement(resultError)
            var err = '<i class="fas fa-fire"></i>\n<span id="error-message">'
            err += errorMessage + '</span>'
            resultError.innerHTML = err
        })
}

window.fillLookupDics = fillLookupDics
function fillLookupDics() {
    var exp = window.rdmlData.rdml.targets;
    window.tarToDye = {}
    window.tarToNr = {}
    for (var i = 0; i < exp.length; i++) {
        window.tarToDye[exp[i].id] = exp[i].dyeId
        window.tarToNr[exp[i].id] = i
    }

    exp = window.rdmlData.rdml.samples;
    window.samToNr = {}
    window.samToType = {}
    for (var i = 0; i < exp.length; i++) {
        window.samToNr[exp[i].id] = i
        window.samToType[exp[i].id] = exp[i].type
    }
}

window.updateClientData = updateClientData
function updateClientData() {
    if (window.selRunOnLoad != "") {
        window.selRun = window.selRunOnLoad
        if ((window.rdmlData.hasOwnProperty("rdml")) && (window.selExperiment != "") && (window.selRun != "")){
            var ret = {}
            ret["mode"] = "get-run-data"
            ret["sel-experiment"] = window.selExperiment
            ret["sel-run"] = window.selRun
            window.selRunOnLoad = ""
            updateServerData(uuid, JSON.stringify(ret))
        }
        return
    }
    // The UUID box
    var ret = '<br /><div class="card">\n<div class="card-body">\n'
    ret += '<h5 class="card-title">Links to other RDML tools</h5>\n<p>Link to this result page:<br />'
    ret += '<a href="' + `${API_LINK}` + "edit.html?UUID=" + window.uuid + '">'
    ret += `${API_LINK}` + "edit.html?UUID=" + window.uuid + '</a> (valid for 3 days)\n</p>\n'
    ret += '<p>Download RDML file:<br />'
    ret += '<a href="' + `${API_URL}` + "/download/" + window.uuid + '" target="_blank" id="download-link">'
    ret += `${API_URL}` + "/download/" + window.uuid + '</a> (valid for 3 days)\n<br />\n'
    ret += '</p>\n'
    ret += '<p>View a single run of this file:<br />'
    ret += '<a href="' + `${API_LINK}` + "runview.html?UUID=" + window.uuid + '">'
    ret += `${API_LINK}` + "runview.html?UUID=" + window.uuid + '</a> (valid for 3 days)\n</p>\n'
    if (window.isvalid == "untested") {
        ret += '<p>Click here to validate RDML file:<br />'
    }
    if (window.isvalid == "valid") {
        ret += '<p>File is valid RDML! Click here for more information:<br />'
    }
    if (window.isvalid == "invalid") {
        ret += '<p>File is not valid RDML! Click here for more information:<br />'
        resultError.innerHTML = '<i class="fas fa-fire"></i>\n<span id="error-message">' +
                                'Error: Uploaded file is not valid RDML!</span>'
        showElement(resultError)
    }
    ret += '<a href="' + `${API_LINK}` + "validate.html?UUID=" + window.uuid + '" target="_blank">'
    ret += `${API_LINK}` + "validate.html?UUID=" + window.uuid + '</a> (valid for 3 days)\n<br />\n'
    ret += '</p>\n</div>\n</div>\n'
    resultLink.innerHTML = ret

    if (!(window.rdmlData.hasOwnProperty("rdml"))) {
        deleteAllData()
        return
    }
    var ret = ''
    var exp = window.rdmlData.rdml.experiments;

    ret = '<table style="width:100%;">'
    ret += '  <tr>\n    <td style="width:10%;">Experiment:</td>\n<td style="width:37%;">'
    ret += '  <select class="form-control" id="dropSelExperiment" onchange="updateExperimenter()">'
    ret += '    <option value="">No experiment selected</option>\n'
    window.experimentPos = -1
    for (var i = 0; i < exp.length; i++) {
        ret += '        <option value="' + exp[i].id + '"'
        if (window.selExperiment == exp[i].id) {
            ret += ' selected'
            window.experimentPos = i
        }
        ret += '>' + exp[i].id + '</option>\n'
    }
    ret += '  </select>\n'
    ret += '</td>\n'
    ret += '<td style="width:6%;"></td>'
    ret += '    <td style="width:10%;">Run:</td>\n<td style="width:37%;">'
    ret += '  <select class="form-control" id="dropSelRun" onchange="updateRun()">'
    ret += '    <option value="">No run selected</option>\n'
    window.runPos = -1
    if (window.experimentPos > -1) {
        var runs = exp[window.experimentPos].runs
        for (var i = 0; i < runs.length; i++) {
            ret += '        <option value="' + runs[i].id + '"'
            if (window.selRun == runs[i].id) {
                ret += ' selected'
                window.runPos = i
            }
            ret += '>' + runs[i].id + '</option>\n'
        }
    }
    ret += '</td>\n</tr>\n'
    ret += '</table>\n'

    ret += '<table style="width:100%;">'
    ret += '  <tr>\n    <td style="width:20%;">'
    ret += '  <select class="form-control" id="dropSelDyeType" onchange="updateDyeType()">'
    ret += '        <option value="pos"'
    if (window.dyeType == "pos") {
        ret += ' selected'
    }
    ret += '>Dye by Position</option>\n'
    ret += '        <option value="id"'
    if (window.dyeType == "id") {
        ret += ' selected'
    }
    ret += '>Dye by ID</option>\n'
    ret += '  </select>\n'
    ret += '</td>\n'
    ret += '  <td style="width:5%;">: </td>\n'
    ret += '  <td style="width:22%;">'
    ret += '  <select class="form-control" id="dropSelDyeSel" onchange="updateDyeSel()">'
    if (window.dyeType == "pos") {
        for (var i = 0; i < window.reactData.max_data_len; i++) {
            ret += '        <option value="' + i + '"'
            if (parseInt(window.dyeSel) == i) {
                ret += ' selected'
            }
            ret += '>' + (i + 1) + '</option>\n'
        }
    } else {
        var dyesEle = window.rdmlData.rdml.dyes;
        for (var i = 0; i < dyesEle.length; i++) {
            ret += '        <option value="' + dyesEle[i].id + '"'
            if (parseInt(window.dyeSel) == dyesEle[i].id) {
                ret += ' selected'
            }
            ret += '>' + dyesEle[i].id + '</option>\n'
        }
    }
    ret += '</td>\n'
    ret += '<td style="width:6%;"></td>'

    ret += '  <td style="width:13%;">'
    ret += '  <select class="form-control" id="dropSelYScale" onchange="updateYScale()">'
    ret += '        <option value="lin"'
    if (window.yScale == "lin") {
        ret += ' selected'
    }
    ret += '>Linear Scale</option>\n'
    ret += '        <option value="log"'
    if (window.yScale == "log") {
        ret += ' selected'
    }
    ret += '>Logarithmic Scale</option>\n'
    ret += '  </select>\n'
    ret += '</td>\n'
    ret += '  <td style="width:5%;"></td>\n'


    ret += '  <td style="width:10%;">'
    ret += '  <select class="form-control" id="dropSelCurveSource" onchange="updateCurveSource()">'
    ret += '        <option value="adp"'
    if (window.curveSource == "adp") {
        ret += ' selected'
    }
    ret += '>Amplification</option>\n'
    ret += '        <option value="mdp"'
    if (window.curveSource == "mdp") {
        ret += ' selected'
    }
    ret += '>Meltcurve</option>\n'
    ret += '  </select>\n'
    ret += '</td>\n'
    ret += '  <td style="width:5%;"></td>\n'


    ret += '  <td style="width:14%;">'
    ret += '  <select class="form-control" id="dropSelColorStyle" onchange="updateColorStyle()">'
    ret += '        <option value="tarsam"'
    if (window.colorStyle == "tarsam") {
        ret += ' selected'
    }
    ret += '>Target & Sample</option>\n'
    ret += '        <option value="type"'
    if (window.colorStyle == "type") {
        ret += ' selected'
    }
    ret += '>Type</option>\n'
    ret += '        <option value="tar"'
    if (window.colorStyle == "tar") {
        ret += ' selected'
    }
    ret += '>Target</option>\n'
    ret += '        <option value="sam"'
    if (window.colorStyle == "sam") {
        ret += ' selected'
    }
    ret += '>Sample</option>\n'
    ret += '  </select>\n'
    ret += '</td>\n</tr>\n'
    ret += '</table>\n'
    selectorsData.innerHTML = ret

    var reacts = window.reactData.reacts
    if ((window.experimentPos > -1) && (window.runPos > -1)) {
        var the_run = exp[window.experimentPos].runs[window.runPos]
        var rows = parseInt(the_run.pcrFormat.rows)
        var columns = parseInt(the_run.pcrFormat.columns)
        var rowLabel = the_run.pcrFormat.rowLabel
        var columnLabel = the_run.pcrFormat.columnLabel
        ret = '<table id="rdmlPlateTab" style="width:100%;">'
        ret += '<tr><td></td>'
        for (var h = 0; h < columns; h++) {
            if (columnLabel == "123") {
                ret += '  <td>' + (h + 1) + '</td>'
            } else if (columnLabel == "ABC") {
                ret += '  <td>' + String.fromCharCode('A'.charCodeAt(0) + h) + '</td>'
            }
        }
        ret += '</tr>\n'
        for (var r = 0; r < rows; r++) {
            ret += '  <tr>'
            if (rowLabel == "123") {
                ret += '  <td>' + (r + 1) + '</td>'
            } else if (rowLabel == "ABC") {
                ret += '  <td>' + String.fromCharCode('A'.charCodeAt(0) + r) + '</td>'
            }
            for (var c = 0; c < columns; c++) {
                var id = r * columns + c + 1
                var cell = '  <td></td>'
                for (var reac = 0; reac < reacts.length; reac++) {
                    if (parseInt(reacts[reac].id) == id) {
                        var dataPos = -1
                        if ((window.dyeType == "pos") && (window.dyeSel < reacts[reac].datas.length)){
                            dataPos = window.dyeSel
                        }
                        if (window.dyeType == "id") {
                            for (var fi = 0; fi < reacts[reac].datas.length; fi++) {
                                if (window.tarToDye[reacts[reac].datas[fi].tar] == window.dyeSel) {
                                    dataPos = fi
                                }
                            }
                        }


                        var exlReact = reacts[reac].datas[dataPos].hasOwnProperty("excl")
                        var colo = "#000000"
                        if (window.colorStyle == "type") {
                            var samType = window.samToType[reacts[reac].sample]
                            if (samType =="unkn") {
                                colo = "#000000"
                            }
                            if (samType =="std") {
                                colo = "#a9a9a9"
                            }
                            if (samType =="ntc") {
                                colo = "#ff0000"
                            }
                            if (samType =="nac") {
                                colo = "#ff0000"
                            }
                            if (samType =="ntp") {
                                colo = "#ff0000"
                            }
                            if (samType =="nrt") {
                                colo = "#ff0000"
                            }
                            if (samType =="pos") {
                                colo = "#006400"
                            }
                            if (samType =="opt") {
                                colo = "#8b008b"
                            }
                            if (exlReact) {
                                colo = "#ffff00"
                            }
                        }
                        if (window.colorStyle == "tar") {
                            var tarNr = window.tarToNr[reacts[reac].datas[dataPos].tar]
                            if (exlReact) {
                                colo = "#ff0000"
                            } else {
                                colo = colorByNr(tarNr)
                            }
                        }
                        if (window.colorStyle == "sam") {
                            var samNr = window.samToNr[reacts[reac].sample]
                            if (exlReact) {
                                colo = "#ff0000"
                            } else {
                                colo = colorByNr(samNr)
                            }
                        }
                        if (window.colorStyle == "tarsam") {
                            var samNr = window.samToNr[reacts[reac].sample]
                            var tarNr = window.tarToNr[reacts[reac].datas[dataPos].tar]
                            var samCount = window.rdmlData.rdml.samples.length
                            var samTarNr = tarNr * samCount + samNr
                            if (exlReact) {
                                colo = "#ff0000"
                            } else {
                                colo = colorByNr(samTarNr)
                            }
                        }
                        // colo = colorByNr(id)
                        var fon_col = "#000000"
                        if (hexToGrey(colo) < 128) {
                            fon_col = "#ffffff"
                        }
                        if (dataPos > -1){
                            cell = '  <td id="plateTab_' + id + '" style="font-size:0.7em;background-color:' + colo
                            cell += ';color:' + fon_col + ';" onclick="showReactSel(' + id + ')">'
                            cell += reacts[reac].sample + '<br />'
                            cell += reacts[reac].datas[dataPos].tar + '<br />'
                            cell += reacts[reac].datas[dataPos].cq + '</td>'
                        }
                    }
                }
                ret += cell
            }
            ret += '</tr>\n'
        }
        ret += '</table>'
        plateData.innerHTML = ret

        if (window.curveSource == "adp") {
            window.winXst = 0;
            window.winXend = 5 * Math.ceil(window.reactData.adp_cyc_max / 5);
            window.winYst = window.reactData.adp_fluor_min;
            window.winYend = window.reactData.adp_fluor_max;
        } else {
            window.winXst = 5 * Math.floor(window.reactData.mdp_tmp_min / 5);
            window.winXend = 5 * Math.ceil(window.reactData.mdp_tmp_max / 5);
            window.winYst = window.reactData.mdp_fluor_min;
            window.winYend = window.reactData.mdp_fluor_max;
        }
        showSVG();
    }
}

window.updateExperimenter = updateExperimenter;
function updateExperimenter() {
    var newData = getSaveHtmlData("dropSelExperiment")
    if (window.selExperiment == newData) {
        return
    }
    window.selExperiment = newData
    window.selRun = ""
    updateClientData()
}

window.updateRun = updateRun;
function updateRun() {
    var newData = getSaveHtmlData("dropSelRun")
    if (window.selRun == newData) {
        return
    }
    window.selRun = newData
    if (!(window.rdmlData.hasOwnProperty("rdml"))) {
        return
    }
    if ((window.selExperiment == "") || (window.selRun == "")){
        return
    }
    var ret = {}
    ret["mode"] = "get-run-data"
    ret["sel-experiment"] = window.selExperiment
    ret["sel-run"] = window.selRun
    updateServerData(uuid, JSON.stringify(ret))
}

window.updateDyeType = updateDyeType;
function updateDyeType() {
    var newData = getSaveHtmlData("dropSelDyeType")
    if (window.dyeType == newData) {
        return
    }
    window.dyeType = newData
    if (window.dyeType == "pos") {
        window.dyeSel = 0
    } else {
        window.dyeSel =  window.rdmlData.rdml.dyes[0].id;
    }
    updateClientData()
}

window.updateDyeSel = updateDyeSel;
function updateDyeSel() {
    var newData = getSaveHtmlData("dropSelDyeSel")
    if (window.dyeSel == newData) {
        return
    }
    window.dyeSel = newData
    updateClientData()
}

window.updateYScale = updateYScale;
function updateYScale() {
    var newData = getSaveHtmlData("dropSelYScale")
    if (window.yScale == newData) {
        return
    }
    window.yScale = newData
    updateClientData()
}

window.updateCurveSource = updateCurveSource;
function updateCurveSource() {
    var newData = getSaveHtmlData("dropSelCurveSource")
    if (window.curveSource == newData) {
        return
    }
    window.curveSource = newData
    updateClientData()
}

window.updateColorStyle = updateColorStyle;
function updateColorStyle() {
    var newData = getSaveHtmlData("dropSelColorStyle")
    if (window.colorStyle == newData) {
        return
    }
    window.colorStyle = newData
    updateClientData()
}

window.showSVG = showSVG;
function showSVG() {
    var retVal = createSVG(window.reactData, window.winXst, window.winXend, window.winYst, window.winYend,
                           window.frameXst, window.frameXend, window.frameYst, window.frameYend);
    if (0) {
    var regEx1 = /</g;
    retVal = retVal.replace(regEx1, "%3C");
    var regEx2 = />/g;
    retVal = retVal.replace(regEx2, "%3E");
    var regEx3 = /#/g;
    retVal = retVal.replace(regEx3, "%23");
    retVal = '<img src="data:image/svg+xml,' + retVal + '" alt="Digest-SVG" width="900px">';
    }
    var sectionResults = document.getElementById('curves-data')
    sectionResults.innerHTML = retVal;
}

function createSVG(tr,startX,endX,startY,endY,wdXst,wdXend,wdYst,wdYend) {
    var retVal = createAllCurves(tr,startX,endX,startY,endY,wdXst,wdXend,wdYst,wdYend);
    retVal += createCoodinates (tr,startX,endX,startY,endY,wdXst,wdXend,wdYst,wdYend);
    retVal += "<g id='svgHighCurve'></g>"
    retVal += "</svg>";
    var head = "<svg xmlns='http://www.w3.org/2000/svg' viewBox='-60 -40 600 400' width='900px'>";
    return head + retVal;
}

function createCoodinates (tr,startX,endX,startY,endY,wdXst,wdXend,wdYst,wdYend){
    var lineXst = wdXst;
    var lineXend = wdXend + 5;
    var lineYst = wdYst - 5;
    var lineYend = wdYend;
    var retVal = "<line x1='" + lineXst + "' y1='" + lineYend;
    retVal += "' x2='" + lineXend + "' y2='" + lineYend + "' stroke-width='2' stroke='black' stroke-linecap='square'/>";
    retVal += "<line x1='" + lineXst + "' y1='" + lineYst;
    retVal += "' x2='" + lineXst + "' y2='" + lineYend + "' stroke-width='2' stroke='black' stroke-linecap='square'/>";

    // The X-Axis
    var xStep = 5;
    for (var i = 0; (i * xStep + startX) < (endX + xStep); i++) {
        var xPos = wdXst + i * xStep / (endX - startX) * (wdXend - wdXst);
        retVal += "<line x1='" + xPos + "' y1='" + lineYend;
        retVal += "' x2='" + xPos + "' y2='" + (lineYend + 7) + "' stroke-width='2' stroke='black' />";
        retVal += "<text x='" + xPos + "' y='" + (lineYend + 26);
        retVal += "' font-family='Arial' font-size='20' fill='black' text-anchor='middle'>";
        retVal += (i * xStep + startX) + "</text>";
    }

    // The Y-Axis
    if (window.yScale == "lin") {
        var yPow = Math.pow(10, Math.floor(Math.log10(endY/10)));
        var yRound = Math.floor(Math.log10(endY/10)) * -1;
        if (yRound < 0) {
            yRound = 0;
        }
        var yStep = Math.floor(endY/10/yPow) * yPow;
        for (var i = 0; i * yStep < endY; i++) {
            var yPos = wdYend - i * yStep / endY * (wdYend - wdYst);
            retVal += "<line x1='" + lineXst + "' y1='" + yPos;
            retVal += "' x2='" + (lineXst - 7) + "' y2='" + yPos + "' stroke-width='2' stroke='black' />";
            retVal += "<text x='" + (lineXst - 11) + "' y='" + (yPos + 3);
            retVal += "' font-family='Arial' font-size='10' fill='black' text-anchor='end'>";
           retVal += (i * yStep).toFixed(yRound) + "</text>";
        }
    } else {
        var fixStart = startY
        if (window.minLogCutoff > fixStart) {
            fixStart = window.minLogCutoff;
        }
        var yPow = Math.pow(10, Math.floor(Math.log10((Math.log10(endY)-Math.log10(fixStart))/10)));
        var yStep = Math.floor((Math.log10(endY)-Math.log10(fixStart))/10/yPow) * yPow;
        var minVal = Math.ceil(10 * Math.log10(fixStart)) / 10
        for (var i = 0; i * yStep < (Math.log10(endY)-Math.log10(fixStart)) ; i++) {
            var yPos = wdYend - (i * yStep + (minVal - Math.log10(fixStart))) / (Math.log10(endY) - Math.log10(fixStart)) * (wdYend - wdYst);
            retVal += "<line x1='" + lineXst + "' y1='" + yPos;
            retVal += "' x2='" + (lineXst - 7) + "' y2='" + yPos + "' stroke-width='2' stroke='black' />";
            retVal += "<text x='" + (lineXst - 11) + "' y='" + (yPos + 3);
            retVal += "' font-family='Arial' font-size='10' fill='black' text-anchor='end'>";
            retVal += (i * yStep + minVal).toFixed(1) + "</text>";
        }
    }
    return retVal;
}

function createAllCurves(tr,startX,endX,startY,endY,wdXst,wdXend,wdYst,wdYend){
    var retVal = ""
    var reacts = window.reactData.reacts
    var the_run = window.rdmlData.rdml.experiments[window.experimentPos].runs[window.runPos]
    var rows = parseInt(the_run.pcrFormat.rows)
    var columns = parseInt(the_run.pcrFormat.columns)
    for (var r = 0; r < rows; r++) {
        for (var c = 0; c < columns; c++) {
            var id = r * columns + c + 1
            for (var reac = 0; reac < reacts.length; reac++) {
                if (parseInt(reacts[reac].id) == id) {
                    var dataPos = -1
                    if ((window.dyeType == "pos") && (window.dyeSel < reacts[reac].datas.length)){
                        dataPos = window.dyeSel
                    }
                    if (window.dyeType == "id") {
                        var dataPos = -1
                        for (var fi = 0; fi < reacts[reac].datas.length; fi++) {
                            if (window.tarToDye[reacts[reac].datas[fi].tar] == window.dyeSel) {
                                dataPos = fi
                            }
                        }
                    }
                    if (dataPos > -1){
                        var exlReact = reacts[reac].datas[dataPos].hasOwnProperty("excl")
                        var colo = "#000000"
                        if (window.colorStyle == "type") {
                            var samType = window.samToType[reacts[reac].sample]
                            if (samType =="unkn") {
                                colo = "#000000"
                            }
                            if (samType =="std") {
                                colo = "#a9a9a9"
                            }
                            if (samType =="ntc") {
                                colo = "#ff0000"
                            }
                            if (samType =="nac") {
                                colo = "#ff0000"
                            }
                            if (samType =="ntp") {
                                colo = "#ff0000"
                            }
                            if (samType =="nrt") {
                                colo = "#ff0000"
                            }
                            if (samType =="pos") {
                                colo = "#006400"
                            }
                            if (samType =="opt") {
                                colo = "#8b008b"
                            }
                            if (exlReact) {
                                colo = "#ffff00"
                            }
                        }
                        if (window.colorStyle == "tar") {
                            var tarNr = window.tarToNr[reacts[reac].datas[dataPos].tar]
                            if (exlReact) {
                                colo = "#ff0000"
                            } else {
                                colo = colorByNr(tarNr)
                            }
                        }
                        if (window.colorStyle == "sam") {
                            var samNr = window.samToNr[reacts[reac].sample]
                            if (exlReact) {
                                colo = "#ff0000"
                            } else {
                                colo = colorByNr(samNr)
                            }
                        }
                        if (window.colorStyle == "tarsam") {
                            var samNr = window.samToNr[reacts[reac].sample]
                            var tarNr = window.tarToNr[reacts[reac].datas[dataPos].tar]
                            var samCount = window.rdmlData.rdml.samples.length
                            var samTarNr = tarNr * samCount + samNr
                            if (exlReact) {
                                colo = "#ff0000"
                            } else {
                                colo = colorByNr(samTarNr)
                            }
                        }
                        if (window.curveSource == "adp") {
                            retVal += createOneCurve(parseInt(reacts[reac].id),"1.2",reacts[reac].datas[dataPos].adps,colo,startX,endX,startY,endY,wdXst,wdXend,wdYst,wdYend);
                        } else {
                            retVal += createOneCurve(parseInt(reacts[reac].id),"1.2",reacts[reac].datas[dataPos].mdps,colo,startX,endX,startY,endY,wdXst,wdXend,wdYst,wdYend);
                        }
                    }
                }
            }
        }
    }
    return retVal;
}

function createOneHighCurve(id) {
    var theSvg = document.getElementById('svgHighCurve')
    if (id == "") {
        theSvg.innerHTML = ""
        return
    }
    var retVal = ""
    var reacts = window.reactData.reacts
    for (var reac = 0; reac < reacts.length; reac++) {
        if (parseInt(reacts[reac].id) == parseInt(id)) {
            var dataPos = -1
            if ((window.dyeType == "pos") && (window.dyeSel < reacts[reac].datas.length)){
                dataPos = window.dyeSel
            }
            if (window.dyeType == "id") {
                var dataPos = -1
                for (var fi = 0; fi < reacts[reac].datas.length; fi++) {
                    if (window.tarToDye[reacts[reac].datas[fi].tar] == window.dyeSel) {
                        dataPos = fi
                    }
                }
            }
            if (dataPos > -1){
                var exlReact = reacts[reac].datas[dataPos].hasOwnProperty("excl")
                var colo = "#000000"
                if (window.colorStyle == "type") {
                    var samType = window.samToType[reacts[reac].sample]
                    if (samType =="unkn") {
                        colo = "#000000"
                    }
                    if (samType =="std") {
                        colo = "#a9a9a9"
                    }
                    if (samType =="ntc") {
                        colo = "#ff0000"
                    }
                    if (samType =="nac") {
                        colo = "#ff0000"
                    }
                    if (samType =="ntp") {
                        colo = "#ff0000"
                    }
                    if (samType =="nrt") {
                        colo = "#ff0000"
                    }
                    if (samType =="pos") {
                        colo = "#006400"
                    }
                    if (samType =="opt") {
                        colo = "#8b008b"
                    }
                    if (exlReact) {
                        colo = "#ffff00"
                    }
                }
                if (window.colorStyle == "tar") {
                    var tarNr = window.tarToNr[reacts[reac].datas[dataPos].tar]
                    if (exlReact) {
                        colo = "#ff0000"
                    } else {
                        colo = colorByNr(tarNr)
                    }
                }
                if (window.colorStyle == "sam") {
                    var samNr = window.samToNr[reacts[reac].sample]
                    if (exlReact) {
                        colo = "#ff0000"
                    } else {
                        colo = colorByNr(samNr)
                    }
                }
                if (window.colorStyle == "tarsam") {
                    var samNr = window.samToNr[reacts[reac].sample]
                    var tarNr = window.tarToNr[reacts[reac].datas[dataPos].tar]
                    var samCount = window.rdmlData.rdml.samples.length
                    var samTarNr = tarNr * samCount + samNr
                    if (exlReact) {
                        colo = "#ff0000"
                    } else {
                        colo = colorByNr(samTarNr)
                    }
                }
                if (window.curveSource == "adp") {
                    retVal += createOneCurve(parseInt(reacts[reac].id),"3.0",reacts[reac].datas[dataPos].adps,colo,
                                             window.winXst, window.winXend, window.winYst, window.winYend,
                                             window.frameXst, window.frameXend, window.frameYst, window.frameYend);
                } else {
                    retVal += createOneCurve(parseInt(reacts[reac].id),"3.0",reacts[reac].datas[dataPos].mdps,colo,
                                             window.winXst, window.winXend, window.winYst, window.winYend,
                                             window.frameXst, window.frameXend, window.frameYst, window.frameYend);
                }
            }
        }
    }
    theSvg.innerHTML = retVal;
}

window.showReactSel = showReactSel;
function showReactSel(react) {
    if (window.lastSelReact == react) {
        if (window.lastSelReact != "") {
            document.getElementById('plateTab_' + window.lastSelReact).style.border = "none";
            createOneHighCurve("")
            window.lastSelReact = ""
        }
    } else {
        document.getElementById('plateTab_' + react).style.border = "thick solid #006400";
        createOneHighCurve(react)
        if (window.lastSelReact != "") {
            document.getElementById('plateTab_' + window.lastSelReact).style.border = "none";
        }
        window.lastSelReact = react
    }
}

function colorByNr(number) {
    var col = [
                                                    "#FF4A46", "#008941", "#006FA6", "#A30059",
                   "#7A4900", "#0000A6", "#63FFAC", "#B79762", "#004D43", "#8FB0FF", "#997D87",
        "#5A0007", "#809693",            "#1B4400", "#4FC601", "#3B5DFF", "#4A3B53", "#FF2F80",
        "#61615A", "#BA0900", "#6B7900", "#00C2A0", "#FFAA92", "#FF90C9", "#B903AA", "#D16100",
                   "#000035", "#7B4F4B", "#A1C299", "#300018", "#0AA6D8", "#013349", "#00846F",
        "#372101", "#FFB500",            "#A079BF", "#CC0744", "#C0B9B2", "#C2FF99", "#001E09",
        "#00489C", "#6F0062", "#0CBD66", "#EEC3FF", "#456D75", "#B77B68", "#7A87A1", "#788D66",
        "#885578", "#FAD09F", "#FF8A9A", "#D157A0", "#BEC459", "#456648", "#0086ED", "#886F4C",

        "#34362D", "#B4A8BD", "#00A6AA", "#452C2C", "#636375", "#A3C8C9", "#FF913F", "#938A81",
        "#575329", "#00FECF", "#B05B6F", "#8CD0FF", "#3B9700", "#04F757", "#C8A1A1", "#1E6E00",
        "#7900D7", "#A77500", "#6367A9", "#A05837", "#6B002C", "#772600", "#D790FF", "#9B9700",
        "#549E79", "#FFF69F", "#201625", "#72418F", "#BC23FF", "#99ADC0", "#3A2465", "#922329",
        "#5B4534", "#FDE8DC", "#404E55", "#0089A3", "#CB7E98", "#A4E804", "#324E72", "#6A3A4C",
        "#83AB58", "#001C1E", "#D1F7CE", "#004B28", "#C8D0F6", "#A3A489", "#806C66", "#222800",
        "#BF5650", "#E83000", "#66796D", "#DA007C", "#FF1A59", "#8ADBB4", "#1E0200", "#5B4E51",
        "#C895C5", "#320033", "#FF6832", "#66E1D3", "#CFCDAC", "#D0AC94", "#7ED379", "#012C58",
        "#FFFF00", "#1CE6FF", "#FF34FF"
    ]
    var num = parseInt(number) % (col.length - 1)
    return col[num]
}

function hexToGrey(hex) {
    var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return Math.floor((parseInt(result[1], 16) + parseInt(result[2], 16) + parseInt(result[3], 16)) / 3)
}


function colorByNr2(number) {
    number = parseInt(number) + 1;
    var base = Math.floor(number / 7);
    var jump = number % 7;

    if (jump == 0) {
        return "rgb(" + rdmlNumberInverter(base) + ", " + rdmlNumberInverter(base) + ", " + rdmlNumberInverter(base) + ")"
    }
    if (jump == 1) {
        return "rgb(" + rdmlNumberInverter(base) + ", " + rdmlNumberInverter(base) + ", " +  rdmlNumberInverter(base + 1) + ")"
    }
    if (jump == 2) {
        return "rgb(" + rdmlNumberInverter(base) + ", " + rdmlNumberInverter(base + 1) + ", " +  rdmlNumberInverter(base) + ")"
    }
    if (jump == 3) {
        return "rgb(" + rdmlNumberInverter(base) + ", " + rdmlNumberInverter(base + 1) + ", " + rdmlNumberInverter(base + 1) + ")"
    }
    if (jump == 4) {
        return "rgb(" + rdmlNumberInverter(base + 1) + ", " + rdmlNumberInverter(base) + ", " +  rdmlNumberInverter(base) + ")"
    }
    if (jump == 5) {
        return "rgb(" + rdmlNumberInverter(base + 1) + ", " + rdmlNumberInverter(base) + ", " +  rdmlNumberInverter(base + 1 ) + ")"
    }
    if (jump == 6) {
        return "rgb(" + rdmlNumberInverter(base + 1) + ", " + rdmlNumberInverter(base + 1) + ", " +  rdmlNumberInverter(base) + ")"
    }
    return "#ffffff";
}

function rdmlNumberInverter(number) {
    var ret = 0;
    var proc = number
    if (proc % 2 == 0) {
        ret += 128
    }
    proc = Math.floor(proc / 2)
    if (proc % 2 == 0) {
        ret += 64
    }
    proc = Math.floor(proc / 2)
    if (proc % 2 == 0) {
        ret += 32
    }
    proc = Math.floor(proc / 2)
    if (proc % 2 == 0) {
        ret += 16
    }
    proc = Math.floor(proc / 2)
    if (proc % 2 == 0) {
        ret += 8
    }
    proc = Math.floor(proc / 2)
    if (proc % 2 == 0) {
        ret += 4
    }
    proc = Math.floor(proc / 2)
    if (proc % 2 == 0) {
        ret += 2
    }
    proc = Math.floor(proc / 2)
    if (proc % 2 == 0) {
        ret += 1
    }
    return ret;
}

function createOneCurve(id,stroke_str,curveDots,col,startX,endX,startY,endY,wdXst,wdXend,wdYst,wdYend){
    var retVal = "<polyline fill='none' stroke-linejoin='round' stroke='" + col;
    retVal += "' stroke-width='" + stroke_str + "' points='";
    var fixStart = startY
    if (window.minLogCutoff > fixStart) {
        fixStart = window.minLogCutoff;
    }
    for (var i = 0; i < curveDots.length; i++) {
        var xPos = wdXst + (parseFloat(curveDots[i][0]) - startX) / (endX - startX) * (wdXend - wdXst);
        if (window.yScale == "lin") {
            var yPos = wdYend - parseFloat(curveDots[i][1]) / endY * (wdYend - wdYst);
        } else {
            if (window.minLogCutoff > parseFloat(curveDots[i][1])) {
                var yPos = wdYend;
            } else {
                var yPos = wdYend - (Math.log10(parseFloat(curveDots[i][1])) - Math.log10(fixStart)) / (Math.log10(endY) - Math.log10(fixStart)) * (wdYend - wdYst);
            }
        }
        retVal += xPos + "," + yPos + " ";
    }
    retVal += "' onclick='showReactSel(" + id + ")'/>";
    return retVal;
}

function errorMessage(err) {
    deleteContent();
    var html = '<div id="traceView-error" class="alert alert-danger" role="alert">';
    html += '  <i class="fas fa-fire"></i>';
    html += '  <span id="error-message">' + err;
    html += '  </span>';
    html += '</div>';
    var trTrc = document.getElementById('traceView-Traces');
    trTrc.innerHTML = html;
}








function deleteAllData() {
    experimentersData.innerHTML = ""
}

function showElement(element) {
    element.classList.remove('d-none')
}

function hideElement(element) {
    element.classList.add('d-none')
}

function resetGlobalValues() {
    winXst = 0;
    winXend = 600;
    winYend = 2300;
    frameXst = 0;
    frameXend = 1000;
    frameYst = 0;
    frameYend = 200;
}

function createButtons() {
    var html = '<div id="traceView-Buttons" class="d-none">';
    html += '  <button id="traceView-nav-bw-win" class="btn btn-outline-secondary">prev</button>';
    html += '  <button id="traceView-nav-bw-bit" class="btn btn-outline-secondary">&lt;</button>';
    html += '  <button id="traceView-nav-zy-in" class="btn btn-outline-secondary">Bigger Peaks</button>';
    html += '  <button id="traceView-nav-zy-out" class="btn btn-outline-secondary">Smaller Peaks</button>';
    html += '  <button id="traceView-nav-zx-in" class="btn btn-outline-secondary">Zoom in</button>';
    html += '  <button id="traceView-nav-zx-out" class="btn btn-outline-secondary">Zoom Out</button>';
    html += '  <button id="traceView-nav-fw-bit" class="btn btn-outline-secondary">&gt;</button>';
    html += '  <button id="traceView-nav-fw-win" class="btn btn-outline-secondary">next</button>';
    html += '  <a>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</a>';
    html += '  <button id="traceView-nav-hi-a" class="btn btn-outline-secondary"><strong>A</strong></button>';
    html += '  <button id="traceView-nav-hi-c" class="btn btn-outline-secondary"><strong>C</strong></button>';
    html += '  <button id="traceView-nav-hi-g" class="btn btn-outline-secondary"><strong>G</strong></button>';
    html += '  <button id="traceView-nav-hi-t" class="btn btn-outline-secondary"><strong>T</strong></button>';
    html += '  <button id="traceView-nav-hi-n" class="btn btn-outline-secondary">ACGT</button>';
    html += '</div>';
    html += '<div id="traceView-Traces"></div>';
    html += '<div id="traceView-Sequence" class="d-none">';
    html += '  <hr>\n  <p>Chromatogram Sequence:</p>';
    html += '<textarea class="form-control" id="traceView-traceSeq" rows="7" cols="110"></textarea>';
    html += '</div>';
    html += '<div id="traceView-Reference" class="d-none">';
    html += '  <hr>\n  <p>Reference Sequence:</p>';
    html += '<textarea class="form-control" id="traceView-refSeq" rows="7" cols="110"></textarea>';
    html += '</div>';
    return html;
}

function buttons() {
    resetGlobalValues();
    var trv = document.getElementById('traceView');
    trv.innerHTML = createButtons();

    var navBwWinButton = document.getElementById('traceView-nav-bw-win')
    navBwWinButton.addEventListener('click', navBwWin)
    var navBwBitButton = document.getElementById('traceView-nav-bw-bit')
    navBwBitButton.addEventListener('click', navBwBit)
    var navZoomYinButton = document.getElementById('traceView-nav-zy-in')
    navZoomYinButton.addEventListener('click', navZoomYin)
    var navZoomYoutButton = document.getElementById('traceView-nav-zy-out')
    navZoomYoutButton.addEventListener('click', navZoomYout)
    var navZoomXinButton = document.getElementById('traceView-nav-zx-in')
    navZoomXinButton.addEventListener('click', navZoomXin)
    var navZoomXoutButton = document.getElementById('traceView-nav-zx-out')
    navZoomXoutButton.addEventListener('click', navZoomXout)
    var navFwBitButton = document.getElementById('traceView-nav-fw-bit')
    navFwBitButton.addEventListener('click', navFwBit)
    var navFwWinButton = document.getElementById('traceView-nav-fw-win')
    navFwWinButton.addEventListener('click', navFwWin)
    var navHiAButton = document.getElementById('traceView-nav-hi-a')
    navHiAButton.addEventListener('click', navHiA)
    var navHiCButton = document.getElementById('traceView-nav-hi-c')
    navHiCButton.addEventListener('click', navHiC)
    var navHiGButton = document.getElementById('traceView-nav-hi-g')
    navHiGButton.addEventListener('click', navHiG)
    var navHiTButton = document.getElementById('traceView-nav-hi-t')
    navHiTButton.addEventListener('click', navHiT)
    var navHiNButton = document.getElementById('traceView-nav-hi-n')
    navHiNButton.addEventListener('click', navHiN)
}

function navFaintCol() {
    baseCol = [["#a6d3a6",1.5],["#a6a6ff",1.5],["#a6a6a6",1.5],["#ffa6a6",1.5]];
}

function navHiN() {
    baseCol = [["green",1.5],["blue",1.5],["black",1.5],["red",1.5]];
    SVGRepaint();
}

function navHiA() {
    navFaintCol();
    baseCol[0] = ["green",2.5];
    SVGRepaint();
}

function navHiC() {
    navFaintCol();
    baseCol[1] = ["blue",2.5];
    SVGRepaint();
}

function navHiG() {
    navFaintCol();
    baseCol[2] = ["black",2.5];
    SVGRepaint();
}

function navHiT() {
    navFaintCol();
    baseCol[3] = ["red",2.5];
    SVGRepaint();
}

function navBwBit() {
    var oldStep = winXend - winXst;
    var step = Math.floor(oldStep/3);
    winXst -= step;
    winXend -= step;
    if (winXst < 0) {
        winXst = 0;
        winXend = oldStep;
    }
    SVGRepaint();
}

function navBwWin() {
    var step = winXend - winXst;
    winXst -= step;
    winXend -= step;
    if (winXst < 0) {
        winXst = 0;
        winXend = step;
    }
    SVGRepaint();
}

function navZoomYin() {
    winYend = winYend * 3 / 4;
    SVGRepaint();
}

function navZoomYout() {
    winYend = winYend * 4 / 3;
    SVGRepaint();
}

function navZoomXin() {
    var oldStep = winXend - winXst;
    var center = winXst + oldStep / 2;
    var step = Math.floor(oldStep * 3 / 4);
    winXst = Math.floor(center - step / 2);
    winXend = Math.floor(center + step / 2);
    SVGRepaint();
}

function navZoomXout() {
    var oldStep = winXend - winXst;
    var center = winXst + oldStep / 2;
    var step = Math.floor(oldStep * 4 / 3);
    winXst = Math.floor(center - step / 2);
    winXend = Math.floor(center + step / 2);
    if (winXst < 0) {
        winXst = 0;
        winXend = step;
    }
    SVGRepaint();
}

function navFwBit() {
    var step = Math.floor((winXend - winXst)/3);
    winXst += step;
    winXend += step;
    SVGRepaint();
}

function navFwWin() {
    var step = winXend - winXst;
    winXst += step;
    winXend += step;
    SVGRepaint();
}

function displayTextSeq (tr) {
    var seq = "";
    for (var i = 0; i < tr.basecallPos.length; i++) {
        var base = tr.basecalls[tr.basecallPos[i]] + " ";
        var pos = base.indexOf(":");
    //    if ((i % 60) === 0 && i != 0) {
    //        seq += "\n";
    //    }
        seq += base.charAt(pos + 1);
    }
    var outField = document.getElementById('traceView-traceSeq')
    outField.value = seq.replace(/-/g,"");
    var trSeq = document.getElementById('traceView-Sequence');
    showElement(trSeq);

    if (tr.hasOwnProperty('refalign')){
        var ref = tr.refalign;
        var outField2 = document.getElementById('traceView-refSeq')
        outField2.value = ref.replace(/-/g,"");
        var refSeq = document.getElementById('traceView-Reference');
        showElement(refSeq);
    }
}

function displayData(res) {
    resetGlobalValues();
    allResults = res;
    if (allResults.hasOwnProperty('peakA') == false){
        errorMessage("Bad JSON data: peakA array missing!");
        return;
    }
    if (allResults.hasOwnProperty('peakC') == false){
        errorMessage("Bad JSON data: peakC array missing!");
        return;
    }
    if (allResults.hasOwnProperty('peakG') == false){
        errorMessage("Bad JSON data: peakG array missing!");
        return;
    }
    if (allResults.hasOwnProperty('peakT') == false){
        errorMessage("Bad JSON data: peakt array missing!");
        return;
    }
    if (allResults.hasOwnProperty('basecallPos') == false){
        errorMessage("Bad JSON data: basecallPos array missing!");
        return;
    }
    if (allResults.hasOwnProperty('basecalls') == false){
        errorMessage("Bad JSON data: basecalls array missing!");
        return;
    }
    displayTextSeq(allResults);
    SVGRepaint();
    var trBtn = document.getElementById('traceView-Buttons');
    showElement(trBtn);
}

function deleteContent() {
    var trBtn = document.getElementById('traceView-Buttons');
    hideElement(trBtn);
    var trTrc = document.getElementById('traceView-Traces');
    trTrc.innerHTML = "";
    var trSeq = document.getElementById('traceView-Sequence');
    hideElement(trSeq);
    var outField = document.getElementById('traceView-traceSeq')
    outField.value = "";
    var refSeq = document.getElementById('traceView-Reference');
    hideElement(refSeq);
    var outField2 = document.getElementById('traceView-refSeq')
    outField2.value = "";
}