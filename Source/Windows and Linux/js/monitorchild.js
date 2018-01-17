var cp = require('child_process');
var request = require("request");
var fs = require('fs');
var domonitor = true;
process.send({ type: "getsites", data: { pid: process.pid } });
var arr_sites = [], obj_sites = {}, data = {};
process.on('uncaughtException', function (err, l, r)
{
    log('Caught exception: ' + err + ":" + r);
});
process.on("message", onmsg);
function init()
{
    for (var i = 0; i < arr_sites.length; i++)
    {
        checksite(i);
    }
}
function checksite(i)
{
    if (arr_sites[i].first === undefined)
        setTimeout(function ()
        {
            if (arr_sites[i])
            {
                arr_sites[i].first = "";
                check(arr_sites[i].protocol + "://" + arr_sites[i].url, arr_sites[i].timeout, function (stat)
                {
                    arr_sites[i].timeoutfunc = setTimeout(function () { checksite(i); }, parseInt(arr_sites[i].checkinterval) * 1000); if (stat !== false)
                    {
                        sendstat(i, stat);
                    }
                });
            }
        }, Math.random() * (parseInt(arr_sites[i].checkinterval) * 1000));
    else
        check(arr_sites[i].protocol + "://" + arr_sites[i].url, arr_sites[i].timeout, function (stat)
        {
            if (arr_sites[i])
            arr_sites[i].timeoutfunc = setTimeout(function () { checksite(i); }, parseInt(arr_sites[i].checkinterval) * 1000); if (stat !== false)
            {
                sendstat(i, stat);
            }
        });
}
function sendstat(i, stat)
{
    process.send({ type: "newstats", data: { pid: process.pid, url: arr_sites[i].url, protocol: arr_sites[i].protocol, stat: stat } });
}
function check(url, timeout, cb)
{
    if (domonitor)
    {
        var status = { isup: 0, code: '', msg: '', time: Date.now() };
        request({ url: url, timeout: parseInt(timeout || 0), time: true }, function (err, res, body)
        {
            status.time = res ? res.elapsedTime : "n/a";
            if (!err && res.statusCode == 200)
            {
                status.isup = true;
                status.code = res.statusCode;
                status.msg = res.statusMessage;
            }
            else if (!err)
            {
                status.isup = false;
                status.code = res.statusCode;
                if (res.statusMessage != undefined)
                    status.msg = res.statusMessage;
            }
            else
            {
                status.isup = false;
                if (err.code != undefined)
                    status.code = (err.code).substr(1);
                else
                    status.code = "Problem in url";
            }

            cb(status);
        }).end();
    }
    else
    {
        cb(false);
    }
}
if (!fs.existsSync("database"))
{
    fs.mkdirSync("database");
}
function getdate()
{
    var date = new Date();
    return date.getUTCFullYear() + "." + (date.getUTCMonth()+1) + "." + date.getUTCDate();
}
function onmsg(msg)
{

    switch (msg.type)
    {
        case "getsites":
            if (msg.data.sites === "no")
            {
                arr_sites = JSON.parse(JSON.stringify(msg.data.siteslist));
                for (var i = 0; i < arr_sites.length; i++)
                {
                    if (!fs.existsSync("database/" + arr_sites[i].protocol + arr_sites[i].url))
                    {
                        fs.mkdirSync("database/" + arr_sites[i].protocol + arr_sites[i].url);
                        fs.mkdirSync("database/" + arr_sites[i].protocol + arr_sites[i].url + "/response");
                        fs.mkdirSync("database/" + arr_sites[i].protocol + arr_sites[i].url + "/uptime");
                    }
                    obj_sites[arr_sites[i].protocol + arr_sites[i].url] = JSON.parse(JSON.stringify(arr_sites[i]));
                }
                process.removeListener('message', onmsg);
                process.on("message", dbmsg);
                data.day = getdate();
            }
            else
            {
                arr_sites = JSON.parse(JSON.stringify(msg.data.sites));
                init();
            }
            break;
        case "newsite":
            arr_sites.push(JSON.parse(JSON.stringify(msg.data)));
            checksite(arr_sites.length - 1);
            break;
        case "editsite":
            for (var i = 0; i < arr_sites.length; i++)
            {
                if (arr_sites[i].url == msg.data.url && arr_sites[i].protocol == msg.data.protocol)
                {
                    arr_sites[i].url = msg.data.newurl;
                    arr_sites[i].protocol = msg.data.newprotocol;
                    arr_sites[i].checkinterval = msg.data.newcheckinterval;
                    arr_sites[i].timeout = msg.data.newtimeout;
                    clearTimeout(arr_sites[i].timeoutfunc);
                    checksite(i);
                    return;
                }
            }
            break;
        case "deletesite":
            for (var i = 0; i < arr_sites.length; i++)
            {
                if (arr_sites[i].url == msg.data.url && arr_sites[i].protocol == msg.data.protocol)
                {
                    clearTimeout(arr_sites[i].timeoutfunc);
                    arr_sites[i] = undefined;
                    return;
                }
            }
            break;
        case "monitoring":
            domonitor = msg.data.turnon;
            break;
    }
}
function dbmsg(msg)
{
    switch (msg.type)
    {
        case "newstat":
            data.date = getdate();
            fs.readFile("database/" + msg.data.protocol + msg.data.url + "/response/" + data.date, "utf8", function (err, res)
            {
                var resdata = err ? {} : JSON.parse(res);
                resdata[String(Date.now() % 86400000)] = msg.data.stat.time;
                fs.writeFile("database/" + msg.data.protocol + msg.data.url + "/response/" + data.date, JSON.stringify(resdata));
            });
            if (msg.data.statuschanged!==undefined)
            {
                fs.readFile("database/" + msg.data.protocol + msg.data.url + "/uptime/" + data.date, "utf8", function (err, res)
                {
                    var resdata = err ? {} : JSON.parse(res);
                    resdata[String(Date.now() % 86400000)] = msg.data.statuschanged?{isup:true}:{ isup: msg.data.statuschanged, msg: msg.data.stat.msg, code: msg.data.stat.code };
                    fs.writeFile("database/" + msg.data.protocol + msg.data.url + "/uptime/" + data.date, JSON.stringify(resdata));
                });
            }
            break;
        case "getres":
            fs.readFile("database/" + msg.data.protocol + msg.data.url + "/response/" + msg.data.date, "utf8", function (err, res)
            {
                var resdata = err ? {} : JSON.parse(res);
                process.send({ type: "getres", data: {  req:msg.data,res:resdata } });
            });
            break;
        case "getupt":
            fs.readFile("database/" + msg.data.protocol + msg.data.url + "/uptime/" + msg.data.date, "utf8", function (err, res)
            {
                var resdata = err ? {} : JSON.parse(res);
                process.send({ type: "getupt", data: { req: msg.data, res: resdata } });
            });
            break;
        case "newsite":
            obj_sites[msg.data.protocol + msg.data.url] = msg.data;
            break;
        case "editsite":
            obj_sites[msg.data.newprotocol + msg.data.newurl] = {};
            var sitee = obj_sites[msg.data.newprotocol + msg.data.newurl];
            sitee.url = msg.data.newurl;
            sitee.protocol = msg.data.newprotocol;
            sitee.checkinterval = msg.data.newcheckinterval;
            sitee.timeout = msg.data.newtimeout;
            break;
        case "deletesite":
            obj_sites[msg.data.protocol + msg.data.url] = undefined;
            break;
    }
}
function log(args)
{
    var arr = [];

    for (var x in arguments)
    {
        arr.push(arguments[x]);
    }
    process.send({ type: "log", data: arr });
}