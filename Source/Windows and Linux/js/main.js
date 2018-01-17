var monitor, table, hidden = false;

require('electron').ipcRenderer.on('hidden', function (e, msg)
{
    hidden = msg;
});

window.onerror = function (msg, url, linenumber)
{
    alert('Error message: ' + msg + '\nURL: ' + url + '\nLine Number: ' + linenumber);
    return true;
}

function getdate()
{
    var date = new Date();
    return date.getUTCFullYear() + "." + (date.getUTCMonth() + 1) + "." + date.getUTCDate();
}
function addeval(script)
{
    webportal.updates.push(script);
}
window.addEventListener("load", function ()
{
    jQuery.fn.extend({
        getPath: function ()
        {
            var path, node = this;
            if ($(this).attr("id"))
                return "#" + $(this).attr("id");
            while (node.length)
            {
                var realNode = node[0], name = realNode.localName;
                if (!name) break;
                name = name.toLowerCase();

                var parent = node.parent();

                var sameTagSiblings = parent.children(name);
                if (sameTagSiblings.length > 1)
                {
                    allSiblings = parent.children();
                    var index = allSiblings.index(realNode) + 1;
                    if (index > 1)
                    {
                        name += ':nth-child(' + index + ')';
                    }
                }

                path = name + (path ? '>' + path : '');
                node = parent;
            }

            return path;
        }
    });

    require("./js/monitor.js");
    require("./js/webportal.js");

    monitor.init();

    

    webportal.init();

    webportal.toggle(localStorage.getItem("webportalon")=="true");

    $("#editbutton").click(editsite);
    $("#addbutton").click(addsite);
    $("#deletebutton").click(deletesite);

    $("#savewebportal").click(function ()
    {
        if ($("#portaluser").val() == "" || $("#portalpass").val() == "" || $("#portalport").val() == "")
        {
            alert("None of inputs can be empty");
        }
        else
        {
            localStorage.setItem("portaluser", $("#portaluser").val());
            localStorage.setItem("portalpass", $("#portalpass").val());
            localStorage.setItem("portalport",parseInt($("#portalport").val()));
            webportal.changeport();
            $("#savewebportal").html("Saved")
            setTimeout(function () { $("#savewebportal").html("Save"); }, 1000);
        }
    });

    monitor.getsites(function (sites)
    {
        var data = [];
        for (var i = 0; i < sites.length; i++)
        {
            data.push([sites[i].url, sites[i].protocol, sites[i].checkinterval, sites[i].timeout, "n/a", "n/a"]);
        }
        table = $("#websiteslist").DataTable(
            {
                "initComplete": function ()
                {
                    var api = this.api();
                    api.$('td').click(function ()
                    {

                    });
                },
                data: data,
                columns: [
                    { title: "Url" },
                    { title: "Protocol" },
                    { title: "Interval" },
                    { title: "Timeout" },
                    { title: "Status" },
                    { title: "Response Time" }
                ],
                paging: false,
                scrollY: parseInt(window.getComputedStyle($("#websiteslistcontainer").get(0), null).getPropertyValue("height").substr(0, window.getComputedStyle($("#websiteslistcontainer").get(0), null).getPropertyValue("height").indexOf("p"))) - 170,
                columnDefs: [
            {
                targets: [0, 1, 2, 3, 4, 5],
                className: 'mdl-data-table__cell--non-numeric'
            }
                ]
            }
            );
        if (sites.length > 0)
        {
            $("#currentsite").html(sites[0].protocol + "://" + sites[0].url);
            editbuttons(true);
            $("tr:eq(2)").addClass("selectedrow");
        }
        $('#websiteslist tbody').on('click', 'tr', function ()
        {
            if ($(this).hasClass('selectedrow'))
            {
                editbuttons(false);
                $(this).removeClass('selectedrow');
                $("#currentsite").html("");
            }
            else
            {
                table.$('tr.selectedrow').removeClass('selectedrow');
                $("#currentsite").html($(this).children()[1].innerHTML + "://" + $(this).children()[0].innerHTML);
                editbuttons(true);
                $(this).addClass('selectedrow');
            }
        });
        $('#domonitor').change(function ()
        {
            monitor.switchmonitoring($(this).is(':checked'));
        });
        $("#dowebportal").change(function ()
        {
            if ((localStorage.getItem("portalport") || "") == "" || (localStorage.getItem("portaluser") || "") == "" || (localStorage.getItem("portalpass") || "") == "")
            {
                alert("First change and save web portal information to start it");
                $(this).prop('checked', false);
            }
            else
            {
                localStorage.setItem("webportalon", $(this).is(':checked'));;
                webportal.toggle($(this).is(':checked'));
            }
        });
        $('.headeritem').removeClass("selectedheaderitem");
        $("header").children().last().addClass("selectedheaderitem");
        $("#websites").show();
    });

    var enumerateDaysBetweenDates = function (startDate, endDate)
    {
        var dates = [];
        dates.push(startDate);
        var lastDate = endDate.clone().startOf('day');
        var currDate = startDate.clone().startOf('day');


        while (currDate.add('days', 1).diff(lastDate) < 0)
        {
            dates.push(currDate.clone());
        }
        if (startDate.format("YYYY-MM-DD") != endDate.format("YYYY-MM-DD"))
            dates.push(endDate);
        return dates;
    };
    var datepickerchart = { start: moment.utc(), end: moment.utc() }
    $("#charttype").on("change", drawchart);
    var setcharteventhandler;
    function drawchart()
    {
        if (datepickerchart.start == "" || datepickerchart.end == "")
            return true;
        start = datepickerchart.start;
        end = datepickerchart.end;
        var type = $("#charttype").val();
        var daysbetween = enumerateDaysBetweenDates(start, end);
        var datasx = [];
        var datasy = [];
        var dataup = {
            x: [],
            y: [],
            mode: 'markers',
            type: 'scatter',
            name: 'Online',
            text: [],
            textfont: {
                family: 'Times New Roman'
            },
            textposition: 'bottom center',
            marker: { size: 12, color: "rgb(0,255,0)", symbol: 'circle' },
            hoverinfo: "text"
        };
        var datadown = {
            x: [],
            y: [],
            mode: 'markers',
            type: 'scatter',
            name: 'Offline',
            text: [],
            textfont: {
                family: 'Times New Roman'
            },
            textposition: 'bottom center',
            marker: { size: 12, color: "rgb(255,0,0)", symbol: 'circle' },
            hoverinfo: "text"
        };
        var lineup = {
            x: [],
            y: [],
            mode: 'lines',
            name: 'Online',
            hoverinfo: "none",
            line: { color: "rgb(0,255,0)" }
        };
        var linedown = {
            x: [],
            y: [],
            mode: 'lines',
            name: 'Offline',
            hoverinfo: "none",
            line: { color: "rgb(255,0,0)" }
        };
        var numdone = 0;
        function getnext(i)
        {
            (function (i, day)
            {
                monitor["get" + $("#charttype").val()]($("#currentsite").html().split("://")[1], $("#currentsite").html().split("://")[0], day.format('YYYY.M.D'), function (data)
                {
                    datasx[i] = [];
                    datasy[i] = [];
                    if (type == "res")
                    {
                        for (var key in data)
                        {
                            datasy[i].push(data[key]);
                            datasx[i].push(moment(moment.utc(moment.utc(Math.floor(day.valueOf() / 86400000) * 86400000 + parseInt(key)).format("YYYY-MM-DD HH:mm:ss")).toDate()).format('YYYY-MM-DD HH:mm:ss'));
                        }
                        if (datasx[i].length == 0)
                        {
                            datasx[i].push(day.format("YYYY-MM-DD hh:mm:ss"));
                            datasy[i].push("n/a")
                        }
                    }
                    else
                    {
                        var laststat, first = true;
                        for (var key in data)
                        {

                            laststat = data[key];
                            var obji = data[key].isup ? dataup : datadown;
                            obji.y.push(1);
                            obji.x.push(moment(moment.utc(moment.utc(Math.floor(day.valueOf() / 86400000) * 86400000 + parseInt(key)).format("YYYY-MM-DD HH:mm:ss")).toDate()).format('YYYY-MM-DD HH:mm:ss'));
                            obji.text.push(data[key].isup ? "200\nOK" : data[key].code + "\n" + (data[key].msg || ""));
                            var lineobj = data[key].isup ? lineup : linedown;
                            if (data[key].isup)
                            {
                                lineup.y.push(1);
                                lineup.x.push(moment(moment.utc(moment.utc(Math.floor(day.valueOf() / 86400000) * 86400000 + parseInt(key)).format("YYYY-MM-DD HH:mm:ss")).toDate()).format('YYYY-MM-DD HH:mm:ss'));
                                linedown.y.push(1, null);
                                linedown.x.push(moment(moment.utc(moment.utc(Math.floor(day.valueOf() / 86400000) * 86400000 + parseInt(key)).format("YYYY-MM-DD HH:mm:ss")).toDate()).format('YYYY-MM-DD HH:mm:ss'), null);
                            }
                            else
                            {
                                lineup.y.push(1, null);
                                lineup.x.push(moment(moment.utc(moment.utc(Math.floor(day.valueOf() / 86400000) * 86400000 + parseInt(key)).format("YYYY-MM-DD HH:mm:ss")).toDate()).format('YYYY-MM-DD HH:mm:ss'), null);
                                linedown.y.push(1);
                                linedown.x.push(moment(moment.utc(moment.utc(Math.floor(day.valueOf() / 86400000) * 86400000 + parseInt(key)).format("YYYY-MM-DD HH:mm:ss")).toDate()).format('YYYY-MM-DD HH:mm:ss'));
                            }
                        }
                        if (laststat !== undefined && day.format('YYYY.M.D') == moment.utc().format('YYYY.M.D'))
                        {
                            var obji = laststat.isup ? dataup : datadown;
                            obji.y.push(1);
                            obji.x.push(moment(moment.utc(moment.utc().format("YYYY-MM-DD HH:mm:ss")).toDate()).format('YYYY-MM-DD HH:mm:ss'));
                            obji.text.push(laststat.isup ? "200\nOK" : laststat.code + "\n" + (laststat.msg || ""));

                            if (laststat.isup)
                            {


                                lineup.y.push(1);
                                lineup.x.push(moment(moment.utc(moment.utc().format("YYYY-MM-DD HH:mm:ss")).toDate()).format('YYYY-MM-DD HH:mm:ss'));
                                linedown.y.push(1, null);
                                linedown.x.push(moment(moment.utc(moment.utc().format("YYYY-MM-DD HH:mm:ss")).toDate()).format('YYYY-MM-DD HH:mm:ss'), null);
                            }
                            else
                            {
                                lineup.y.push(1, null);
                                lineup.x.push(moment(moment.utc(moment.utc().format("YYYY-MM-DD HH:mm:ss")).toDate()).format('YYYY-MM-DD HH:mm:ss'), null);
                                linedown.y.push(1);
                                linedown.x.push(moment(moment.utc(moment.utc().format("YYYY-MM-DD HH:mm:ss")).toDate()).format('YYYY-MM-DD HH:mm:ss'));
                            }
                        }
                    }
                    numdone++;
                    if (daysbetween.length != numdone)
                        getnext(i + 1);
                });
            })(i, daysbetween[i]);
        }
        getnext(0);
        var chartcheck = setInterval(function ()
        {
            var layout;
            if (numdone == daysbetween.length)
            {
                clearInterval(chartcheck);
                var data;
                var charty = document.getElementById("charty");
                if (type == "res")
                {
                    var resx = []
                    for (var i = 0; i < datasx.length; i++)
                    {
                        for (var j = 0; j < datasx[i].length; j++)
                        {
                            resx.push(datasx[i][j])
                        }
                    }
                    var resy = []
                    for (var i = 0; i < datasy.length; i++)
                    {
                        for (var j = 0; j < datasy[i].length; j++)
                        {
                            resy.push(datasy[i][j])
                        }
                    }
                    data = [
      {
          x: resx,
          y: resy,
          type: 'scatter'
          ,
          mode: "line"
      }
                    ];
                    layout = { title: $("#currentsite").html() };
                    Plotly.newPlot(charty, data, layout, { scrollZoom: true, displayModeBar: true });
                }
                else
                {
                    layout = {
                        legend: { xref: "x2" },
                        title: $("#currentsite").html(),
                        yaxis: {
                            autorange: true,
                            showgrid: false,
                            zeroline: false,
                            showline: true,
                            autotick: true,
                            ticks: '',
                            showticklabels: false
                        }
                    };
                    data = [linedown, lineup, datadown, dataup];
                    Plotly.newPlot(charty, data, layout, {
                        scrollZoom: true, displayModeBar: true
                    });
                }


                zoomcharthandler = function (eventdata)
                {
                    if (type == "upt")
                        return true;
                    var range = Math.min(((eventdata['xaxis.range[1]'] - eventdata['xaxis.range[0]'])) / 6000000, 200);
                    if (isNaN(range))
                        return true;
                    data[0].y = movingWindowAvg(resy, range);
                    Plotly.redraw(charty);
                }
                charty.on('plotly_relayout',
    zoomcharthandler);
                if (layout.xaxis.range)
                zoomcharthandler({ 'xaxis.range[1]': layout.xaxis.range[1], 'xaxis.range[0]': layout.xaxis.range[0] });
            }
        }, 100);

    }
    var d3_numeric = function (x)
    {
        return !isNaN(x);
    }

    var d3sum = function (array, f)
    {
        var s = 0,
            n = array.length,
            a,
            i = -1;
        if (arguments.length === 1)
        {
            while (++i < n) if (d3_numeric(a = +array[i])) s += a;
        } else
        {
            while (++i < n) if (d3_numeric(a = +f.call(array, array[i], i))) s += a;
        }
        return s;
    };

    var movingWindowAvg = function (arr, step)
    {
        return arr.map(function (_, idx)
        {
            var wnd = arr.slice(idx - step, idx + step + 1);
            var result = d3sum(wnd) / wnd.length; if (isNaN(result)) { result = _; }
            return result;
        });
    };
    function writereportdata(start, end)
    {
        var daysbetween = enumerateDaysBetweenDates(start, end);
        var numdoneupt = 0;
        var numdoneres = 0;
        var arr_upt = [];
        var arr_res = [];
        function getnextupt(i)
        {
            (function (i, day)
            {
                monitor["get" + "upt"]($("#currentsite").html().split("://")[1], $("#currentsite").html().split("://")[0], day.format('YYYY.M.D'), function (data)
                {
                    arr_upt[numdoneupt] = [];
                    for (var key in data)
                    {
                        var datao = data[key];
                        datao.key = parseInt(key);
                        arr_upt[numdoneupt].push(datao);
                    }
                    arr_upt[numdoneupt].day = day;
                    numdoneupt++;
                    if (daysbetween.length != numdoneupt)
                        getnextupt(i + 1);
                    else
                        if (numdoneres == numdoneupt)
                            gotreportdata(arr_res, arr_upt);
                });
            })(i, daysbetween[i]);
        }
        getnextupt(0);
        function getnextres(i)
        {
            (function (i, day)
            {
                monitor["get" + "res"]($("#currentsite").html().split("://")[1], $("#currentsite").html().split("://")[0], day.format('YYYY.M.D'), function (data)
                {
                    arr_res[numdoneres] = [];
                    for (var key in data)
                    {
                        var datao = data[key];
                        datao.key = parseInt(key);
                        arr_res[numdoneres].push(datao);
                    }
                    arr_res[numdoneres].day = day;
                    numdoneres++;
                    if (daysbetween.length != numdoneres)
                        getnextres(i + 1);
                    else
                        if (numdoneres == numdoneupt)
                            gotreportdata(arr_res, arr_upt);
                });
            })(i, daysbetween[i]);
        }
        getnextres(0);
    }
    function gotreportdata(arr_res, arr_upt)
    {
        var reportdata = "";
        for (var i = 0; i < arr_res.length; i++)
        {
            var datestr = ((new Date(arr_upt[i].day)) + "").split(" ");
            datestr.splice(4, 100);
            var avg = 0, avglen = arr_res[i].length;
            for (var j = 0; j < arr_res[i].length; j++)
            {
                if (arr_res[i][j] == "n/a")
                    avglen--
                else
                    avg += arr_res[i][j];
            }
            avg /= avglen;
            reportdata += "<div style='position:relative;padding:10px;background-color:rgb(50,50,50);height:auto;color:white;width:calc(100% - 10px)'><b>Report : " + datestr.join(" ") + "</b><b style='float:right;'>" + (isNaN(avg) || avg === undefined || !isFinite(avg) ? "" : ("Average response time: " + avg.toFixed(5))) + "</b></div>";
            reportdata += "<div style='position:relative;padding:10px;box-shadow:inset 0px 0px 20px -4px;width:calc(100% - 10px)'>";

            for (var j = 0; j < arr_upt[i].length; j++)
            {
                reportdata += (arr_upt[i][j].isup ? "<div style='background-color:green;border-radius:200px;width:10px;height:10px;margin:5px;position:absolute;'></div><b style='position:absolute;left:40px'>" : "<div style='background-color:red;border-radius:200px;width:10px;height:10px;margin:5px;position:absolute;'></div><b style='position:absolute;left:40px'>" + arr_upt[i][j].code + " " + (arr_upt[i][j].msg || "")) + " " + (new Date(Math.floor(arr_upt[i].day / 86400000) * 86400000 + arr_upt[i][j].key)).getHours() + ":" + (new Date(Math.floor(arr_upt[i].day / 86400000) * 86400000 + arr_upt[i][j].key)).getMinutes() + ":" + (new Date(Math.floor(arr_upt[i].day / 86400000) * 86400000 + arr_upt[i][j].key)).getSeconds() + "</b><br/><br/>";
            }
            reportdata += "</div><br/>";
        }
        $("#reportdata").html(reportdata);
    }
    var datepickerreport = { start: '', end: '' }
    $('.headeritem').click(function ()
    {
        jQuery('.headeritem').removeClass("selectedheaderitem");
        jQuery(this).addClass("selectedheaderitem");
        var selectedname = jQuery(this).children().first().html().substr(0, jQuery(this).children().first().html().indexOf("<") > -1 ? jQuery(this).children().first().html().indexOf("<") : jQuery(this).children().first().html().length);
        var selectedid = "#" + selectedname.toLowerCase().replace(" ", "_");
        if ($(selectedid).css("opacity") !== "1")
        {
            $(".content").css("opacity", "0");
            setTimeout(function ()
            {
                $(".content:not(" + selectedid + ")").css("display", "none");
                $(selectedid).css("display", "block");
                setTimeout(function () { $(selectedid).css({ opacity: "1" }); }, 50);
            }, 200);
        }
        switch (selectedname)
        {
            case "Web Portal":
                $("#portaluser").val(localStorage.getItem("portaluser") || "");
                $("#portalpass").val(localStorage.getItem("portalpass") || "");
                $("#portalport").val(localStorage.getItem("portalport") || "");
                webportal.running ? $("#dowebportal").prop("checked", true) : "";
                break;
            case "Report":
                if ($("#currentsite").html() == "")
                {
                    $("#reportnotselected").show();
                    $("#reportcont").hide();
                }
                else
                {
                    $("#reportdata").html("");
                    $("#reportnotselected").hide();
                    $("#reportcont").show();
                    $("#reportdate").daterangepicker({
                        "showDropdowns": true,
                        "timePicker": true,
                        "timePicker24Hour": true,
                        "ranges": {
                            'Today': [moment(), moment()],
                            'Yesterday': [moment().subtract(1, 'days'), moment().subtract(1, 'days')],
                            'Last 7 Days': [moment().subtract(6, 'days'), moment()],
                            'Last 30 Days': [moment().subtract(29, 'days'), moment()],
                            'This Month': [moment().startOf('month'), moment().endOf('month')],
                            'Last Month': [moment().subtract(1, 'month').startOf('month'), moment().subtract(1, 'month').endOf('month')]
                        },
                        "startDate": moment(),
                        "endDate": moment()
                    }, function (start, end, label)
                    {
                        datepickerreport.start = moment.utc(start);
                        datepickerreport.end = moment.utc(end);
                        writereportdata(start, end);
                    });
                    if (datepickerreport.start !== "" && datepickerreport.end !== "")
                    {
                        writereportdata(datepickerreport.start, datepickerreport.end);
                    }

                }
                break;
            case "Chart":
                if ($("#currentsite").html() == "")
                {
                    $("#chartnotselected").show();
                    $("#chartcont").hide();
                }
                else
                {
                    $("#charty").html("");
                    $("#chartnotselected").hide();
                    $("#chartcont").show();
                    $("#chartdate").daterangepicker({
                        "showDropdowns": true,
                        "timePicker": true,
                        "timePicker24Hour": true,
                        "ranges": {
                            'Today': [moment(), moment()],
                            'Yesterday': [moment().subtract(1, 'days'), moment().subtract(1, 'days')],
                            'Last 7 Days': [moment().subtract(6, 'days'), moment()],
                            'Last 30 Days': [moment().subtract(29, 'days'), moment()],
                            'This Month': [moment().startOf('month'), moment().endOf('month')],
                            'Last Month': [moment().subtract(1, 'month').startOf('month'), moment().subtract(1, 'month').endOf('month')]
                        },
                        "startDate": moment(),
                        "endDate": moment()
                    }, function (start, end, label)
                    {
                        datepickerchart.start = moment.utc(start);
                        datepickerchart.end = moment.utc(end);
                        drawchart(moment.utc(start), moment.utc(end), label)
                    });
                    setTimeout(drawchart, 200);
                }
                break;
            case "Notify":
                var defnot = monitor.getdefnotify();
                if ($("#currentsite").html() == "")
                {
                    $("#sitenotify").hide();
                    $("#notwebhead").hide();
                }
                else
                {
                    $("#sitenotify").show();
                    $("#notwebhead").show();
                    $("#siteb.sitenurl").html($("#currentsite").html());
                }
                $("#defnemail").val(defnot.email || "");
                $("#defnwo").prop('checked', defnot.nwo);
                $("#defnbo").prop('checked', defnot.nbo);
                $("#defbaloon").prop('checked', defnot.baloon);
                $("#mailpass").val(localStorage.getItem("maildefpass") || "");
                $("#mailservice").val(localStorage.getItem("maildefservice") || "");
                $("#defsnemail").val(localStorage.getItem("maildef") || "");
                ////////////////////
                var currnoti = monitor.getnotify($("#currentsite").html().split("://")[1], $("#currentsite").html().split("://")[0]);
                if (currnoti == undefined)
                {
                    $("#sitenwo").prop('checked', defnot.nwo);
                    $("#sitenbo").prop('checked', defnot.nbo);
                    $("#sitebaloon").prop('checked', defnot.baloon);
                    $("#sitenemail").val(defnot.email || "");
                    $("#resetnotify").prop('disabled', true);
                }
                else
                {
                    $("#sitenwo").prop('checked', currnoti.nwo);
                    $("#sitenbo").prop('checked', currnoti.nbo);
                    $("#sitbaloon").prop('checked', currnoti.baloon);
                    $("#sitenemail").val(currnoti.email);
                    $("#resetnotify").prop('disabled', false);
                }
                break;
            case "Websites":

                break;
        }
    });
    $("#addwindow").children().each(function (a) { $(this).css("opacity", "1"); });
    $("#savenotifydef").click(function ()
    {
        if ($("#defnemail").val() == "" || $("#mailpass").val() == "" || $("#mailservice").val() == "" || $("#defsnemail").val() == "")
        {
            alert("None of the inputs can be empty");
        }
        else
        {
            monitor.changedefnotify($("#defnemail").val(), $("#defnwo").is(':checked'), $("#defnbo").is(':checked'), $("#defbaloon").is(':checked'));
            localStorage.setItem("maildefpass", $("#mailpass").val());
            localStorage.setItem("maildefservice", $("#mailservice").val());
            localStorage.setItem("maildef", $("#defsnemail").val());
            $("#savenotifydef").html("Saved");
            setTimeout(function () { $("#savenotifydef").html("Save"); }, 1000)
        }
    });
    $("#savenotifysite").click(function ()
    {
        if ($("#sitenemail").val() == "")
        {
            alert("None of the inputs can be empty");
        }
        else
        {
            monitor.setnotify($("#currentsite").html().split("://")[1], $("#currentsite").html().split("://")[0], $("#sitenemail").val(), $("#sitenwo").is(':checked'), $("#sitenbo").is(':checked'), $("#sitebaloon").is(':checked'))
            $("#savenotifysite").html("Saved")
            setTimeout(function () { $("#savenotifysite").html("Save"); }, 1000);
            $("#resetnotify").prop('disabled', false);
        }
    });
    $("#resetnotify").click(function ()
    {
        monitor.delnotify($("#currentsite").html().split("://")[1], $("#currentsite").html().split("://")[0]);
        var defnot = monitor.getdefnotify();
        $("#sitenwo").prop('checked', defnot.nwo);
        $("#sitenbo").prop('checked', defnot.nbo);
        $("#sitebaloon").prop('checked', defnot.baloon);
        $("#sitenemail").val(defnot.email || "");
        $("#resetnotify").html("Reset done");
        setTimeout(function () { $("#resetnotify").html("Reset"); }, 1000);
        $("#resetnotify").prop('disabled', true);
    });
});
/*************************

           Websites Tab

*************************/
function newstats(url, protocol, stat)
{
    var trs = $($("#websiteslist > tbody").children());
    for (var i = 0; i < trs.length; i++)
    {
        var trsc = $(trs[i]).children();
        if (trsc.length > 3 && trsc[0].innerHTML == url && trsc[1].innerHTML == protocol)
        {
            $("tr:eq(" + (i + 2) + ")").children()[4].innerHTML = stat.code + "<br/>" + (stat.msg || "");
            $("tr:eq(" + (i + 2) + ")").children()[5].innerHTML = stat.time || "n/a";
            return;
        }

    }
}
function deletesite()
{
    monitor.removesite($(".selectedrow").children()[0].innerHTML, $(".selectedrow").children()[1].innerHTML);
    var rowind = $(".selectedrow").index() + 1;
    table.row($(".selectedrow")).remove().draw();
    if ($("tr").length > 2 && $("tr:eq(2)").children().length > 2)
    {
        $("tr:eq(" + (($("tr").length == 3 ? 1 : (rowind == $($("tr").last()).index() + 2 ? $($("tr").last()).index() + 1 : rowind)) + 1) + ")").addClass("selectedrow");
        $("#currentsite").html($(".selectedrow").children()[1].innerHTML + "://" + $(".selectedrow").children()[0].innerHTML);
    }
    else
    {
        $("#currentsite").html("");
        editbuttons(false);
    }
}
function editbuttons(show)
{
    if (show)
    {
        $("#deletebutton,#editbutton").css("width", "40px").css("padding", "20px");

    }
    else
    {
        $("#deletebutton,#editbutton").css("width", "0px").css("padding", "0px");
    }
}
window.addEventListener("resize", function ()
{
    $(".dataTables_scrollBody").css("height", parseInt(window.getComputedStyle($("#websiteslistcontainer").get(0), null).getPropertyValue("height").substr(0, window.getComputedStyle($("#websiteslistcontainer").get(0), null).getPropertyValue("height").indexOf("p"))) - 170);
})
function editsite()
{
    $("#editwindow").css("display", "block");
    $("#editwindow").animate({ opacity: 0.93 }, 300, "swing");
    $("#editsiteadd").unbind('click');
    $("#editurl").val($(".selectedrow").children()[0].innerHTML);
    $("#editprotocol").val($(".selectedrow").children()[1].innerHTML);
    $("#editinterval").val($(".selectedrow").children()[2].innerHTML);
    $("#edittimeout").val($(".selectedrow").children()[3].innerHTML);
    $("#editsiteadd").click(function ()
    {
        if ($("#editurl").val() == "")
        {
            alert("Url can't be empty");
            return;
        }
        if ($("#editinterval").val() == "")
        {
            alert("Interval can't be empty");
            return;
        }
        if ($("#edittimeout").val() == "")
        {
            alert("Timeout can't be empty");
            return;
        }
        monitor.editsite($(".selectedrow").children()[0].innerHTML, $(".selectedrow").children()[1].innerHTML, $(".selectedrow").children()[2].innerHTML, $("#editurl").val(), $("#editprotocol").val(), $("#editinterval").val(), $("#edittimeout").val(), function (r)
        {
            if (r)
            {
                table.cell($($(".selectedrow").children()[0])).data($("#editurl").val());
                table.cell($($(".selectedrow").children()[1])).data($("#editprotocol").val());
                table.cell($($(".selectedrow").children()[2])).data($("#editinterval").val());
                table.cell($($(".selectedrow").children()[3])).data($("#edittimeout").val());
                $("#currentsite").html($(".selectedrow").children()[1].innerHTML + "://" + $(".selectedrow").children()[0].innerHTML);
                hideeditwindow();
            }
        });
    });
    $("#editsitecancel").unbind('click');
    $("#editsitecancel").click(hideeditwindow);
}
function addsite()
{

    $("#addwindow").css("display", "block");
    $("#addwindow").animate({ opacity: 0.93 }, 300, "swing");
    $("#addsiteadd").unbind('click');
    $("#addsiteadd").click(function ()
    {
        if ($("#addurl").val() == "")
        {
            alert("Url can't be empty");
            return;
        }
        if ($("#addinterval").val() == "")
        {
            alert("Interval can't be empty");
            return;
        }
        if ($("#addtimeout").val() == "")
        {
            alert("Timeout can't be empty");
            return;
        }
        monitor.addsite($("#addurl").val(), $("#addprotocol").val(), $("#addinterval").val(), $("#addtimeout").val(), function (r)
        {
            if (r)
            {
                table.row.add([$("#addurl").val(), $("#addprotocol").val(), $("#addinterval").val(), $("#addtimeout").val(), "n/a", "n/a"]).draw();
                monitor.getsites(function (st) { if (st.length == 1) $("#currentsite").html(st[0].protocol + "://" + st[0].url); })
                $("#addsiteaddchild").html("Added")
                setTimeout(function () { $("#addsiteaddchild").html("Add"); }, 1000);
                localStorage.setItem($("#addprotocol").val() + $("#addurl").val() + "laston", true);
            }
            else
            {
                alert("Website already added");
            }
        })
    });
    $("#addsitecancel").unbind('click');
    $("#addsitecancel").click(hideaddwindow);
}
function hideaddwindow()
{
    $("#addwindow").animate({ opacity: 0 }, 300, "swing", function () { $("#addwindow").css("display", "none"); });
}
function hideeditwindow()
{
    $("#editwindow").animate({ opacity: 0 }, 300, "swing", function () { $("#editwindow").css("display", "none"); });
}