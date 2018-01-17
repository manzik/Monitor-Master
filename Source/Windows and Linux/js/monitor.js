var cp = require('child_process');
var wellknown = require('nodemailer-wellknown');
var nodemailer = require('nodemailer');
var numcpus = require('os').cpus().length;
const {ipcRenderer} = require('electron');
var request = require("request");
function showbaloon(text)
{
    ipcRenderer.send('baloon', text);
}
function grouper(array, cols)
{

    function split(array, cols)
    {
        if (cols == 1) return array;
        var size = Math.ceil(array.length / cols);
        return array.slice(0, size).concat([null]).concat(split(array.slice(size), cols - 1));
    }

    var a = split(array, cols);
    var groups = [];
    var group = [];
    for (var i = 0, c1 = a.length; i < c1; i++)
    {
        if (a[i] === null)
        {
            groups.push(group);
            group = [];
            continue;
        }
        group.push(a[i]);
    }
    groups.push(group);
    return groups;

}
function sendmail(receiver,text,html,subject)
{
    var arr_check=[receiver,localStorage.getItem("maildef")];
    for(var i=0;i<arr_check.length;i++)
    {
        if(arr_check[i]===null||arr_check[i]===""||arr_check[i]===undefined)
            return;
    }
    var transporter = nodemailer.createTransport({
        service: localStorage.getItem("maildefservice"),
        auth: { user: localStorage.getItem("maildef"), pass: localStorage.getItem("maildefpass") }
    });
    transporter.sendMail(
    {
        from: localStorage.getItem("maildef"),
        to: receiver,
        subject: subject,
        text: text,
        html: html
    },function(error, response){
        if(error){
            alert("error sending email: "+error);
        }else{
            console.log("Message sent: " + response.message);
        }

        transporter.close();
    })
}
monitor = new (function ()
{
    var arr_sites = [];
    var obj_sites = {};
    var obj_pidid = {};
    var obj_idpid = [];
    var childs = [];
    var notifyoptions;
    function onchildmsg(msg)
    {
        switch (msg.type)
        {
            case "getupt":
                obj_databasereqs[msg.data.req.protocol+msg.data.req.url+msg.data.req.date+"upt"](msg.data.res);
                obj_databasereqs[msg.data.req.protocol+msg.data.req.url+msg.data.req.date+"upt"]=undefined;
                break;
            case "getres":
                obj_databasereqs[msg.data.req.protocol+msg.data.req.url+msg.data.req.date+"res"](msg.data.res);
                obj_databasereqs[msg.data.req.protocol+msg.data.req.url+msg.data.req.date+"res"]=undefined;
                break;
            case "getsites":
                childs[obj_pidid[String(msg.data.pid)].id].send({ type: "getsites", data: { sites: obj_pidid[String(msg.data.pid)].sites,siteslist:obj_pidid[String(msg.data.pid)].siteslist } });
                break;
            case "log":
                console.log.apply(null, msg.data);
                break;
            case "newstats":
                var statuschanged=undefined;
                if(interneton)
                {
                    if (obj_sites[msg.data.protocol + msg.data.url].isup != msg.data.stat.isup && ((localStorage.getItem(msg.data.protocol + msg.data.url + "laston")=="true") != msg.data.stat.isup))
                    {
                        statuschanged=msg.data.stat.isup;
                        if(msg.data.stat.isup)
                        {
                            if (notifyoptions.sites[msg.data.protocol + msg.data.url] == undefined ? notifyoptions.default.nbo : notifyoptions.sites[msg.data.protocol + msg.data.url].nbo)
                                sendmail(notifyoptions.sites[msg.data.protocol + msg.data.url] == undefined ? notifyoptions.default.email : notifyoptions.sites[msg.data.protocol + msg.data.url].email, "Server " + msg.data.protocol + "://" + msg.data.url + " became online\n" + (new Date()), "<b>Server " + msg.data.protocol + "://" + msg.data.url + " became online</b><br/>" + (new Date()), "Server " + msg.data.protocol + "://" + msg.data.url + " became online");
                            if (notifyoptions.sites[msg.data.protocol + msg.data.url] == undefined ? notifyoptions.default.baloon : notifyoptions.sites[msg.data.protocol + msg.data.url].baloon)
                                showbaloon("Server " + msg.data.protocol + "://" + msg.data.url + " became online");
                    
                        }
                        else
                        {
                            if (notifyoptions.sites[msg.data.protocol + msg.data.url] == undefined ? notifyoptions.default.nwo : notifyoptions.sites[msg.data.protocol + msg.data.url].nwo)
                                sendmail(notifyoptions.sites[msg.data.protocol + msg.data.url] == undefined ? notifyoptions.default.email : notifyoptions.sites[msg.data.protocol + msg.data.url].email, "Server " + msg.data.protocol + "://" + msg.data.url + " went offline\n" + (new Date()), "<b>Server " + msg.data.protocol + "://" + msg.data.url + " went offline</b><br/>" + (new Date()), "Server " + msg.data.protocol + "://" + msg.data.url + " went offline");
                            if (notifyoptions.sites[msg.data.protocol + msg.data.url] == undefined ? notifyoptions.default.baloon : notifyoptions.sites[msg.data.protocol + msg.data.url].baloon)
                                showbaloon("Server " + msg.data.protocol + "://" + msg.data.url + " went offline");
                    
                        }
                        localStorage.setItem(msg.data.protocol + msg.data.url + "laston", msg.data.stat.isup);
                    }
                    obj_sites[msg.data.protocol + msg.data.url].isup = msg.data.stat.isup;
                    childs[0].send({ type: "newstat", data: { url: msg.data.url, protocol: msg.data.protocol, stat: msg.data.stat,statuschanged:statuschanged } });
                    newstats(msg.data.url, msg.data.protocol, msg.data.stat);
                }
                break;
        }
    }
    var fs = require("fs");
    try
    {
        fs.openSync("./sites.json", 'r', function (err, fd)
        {
        });
    }
    catch (e)
    {
        fs.writeFileSync("./sites.json", "{\"sites\":[]}", {}, function (err)
        {
            if (err) alert(err);
        });
    }
    try
    {
        fs.openSync("./notify.json", 'r', function (err, fd)
        {
        });
    }
    catch (e)
    {
        fs.writeFileSync("./notify.json", "{\"sites\":{},\"default\":{\"nwo\":true,\"nbo\":true,\"email\":\"\",\"baloon\":true}}", {}, function (err)
        {
            if (err) alert(err);
        });
    }
    var interneton=true;
    function check(url, timeout, cb)
    {
        var status = { isup: 0, code: '', msg: '', time: Date.now() };
        request.head({ url: url, timeout: parseInt(timeout || 0), time: true }, function (err, res, body)
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

            interneton=status.isup;
            checknet();
        }).end();
    }
    function checknet()
    {
        setTimeout(function(){check("http://google.com",12000);},500);
    }
    this.init = function ()
    {
        checknet();
        getsites(function (l)
        {
            arr_sites = grouper(JSON.parse(JSON.stringify(l)), Math.max(numcpus - 2, 1));
            arr_sites.unshift([]);
            childs.push(cp.fork("./monitorchild.js", [], { cwd: __dirname }));
            obj_pidid[String(childs[0].pid)] = { id: 0, sites: "no",siteslist:l };
            obj_idpid[0] = String(childs[0].pid);
            for (var i = 1; i < arr_sites.length; i++)
            {
                childs.push(cp.fork("./monitorchild.js", [], { cwd: __dirname }));
                obj_pidid[String(childs[i].pid)] = { id: i, sites: [] };
                obj_idpid[i] = String(childs[i].pid);
                for (var j = 0; j < arr_sites[i].length; j++)
                {
                    obj_sites[arr_sites[i][j].protocol + arr_sites[i][j].url] = { pid: childs[i].pid, id: i };
                    obj_pidid[String(childs[i].pid)].sites.push(JSON.parse(JSON.stringify(arr_sites[i][j])));
                }
            }
            for (var i = 0; i < childs.length; i++)
            {
                childs[i].on("message", onchildmsg);
            }

        });
        fs.readFile("./notify.json", "utf8", function (err, data)
        {
            if (err) alert("error reading from notifying database");
            else
                notifyoptions = JSON.parse(data);
        })
    }
    this.getsites = function (cb)
    {
        getsites(cb);
    }
    this.setnotify=function(url,protocol,email,nwo,nbo,baloon)
    {
        if (notifyoptions.sites[protocol + url] == undefined)
            notifyoptions.sites[protocol + url] = {};
        notifyoptions.sites[protocol + url].email = email;
        notifyoptions.sites[protocol + url].nwo = nwo;
        notifyoptions.sites[protocol + url].nbo = nbo;
        notifyoptions.sites[protocol + url].baloon = baloon;
        fs.writeFile('./notify.json', JSON.stringify(notifyoptions), function (err)
        {
            if (err) alert("error when changing default notify options:(when writing to database)" + err);
        });
    }
    var obj_databasereqs={};
    this.getupt=function(url,protocol,date,cb)
    {
        
        childs[0].send({ type: "getupt", data: { url: url, protocol: protocol, date: date } });
        obj_databasereqs[protocol+url+date+"upt"]=cb;
    }
    this.getres=function(url,protocol,date,cb)
    {
        childs[0].send({ type: "getres", data: { url: url, protocol: protocol, date: date } });
        obj_databasereqs[protocol+url+date+"res"]=cb;
    }
    this.delnotify = function (url, protocol)
    {
        notifyoptions.sites[protocol + url] = undefined;
        fs.writeFile('./notify.json', JSON.stringify(notifyoptions), function (err)
        {
            if (err) alert("error when changing default notify options:(when writing to database)" + err);
        });
    }
    this.getnotify = function (url, protocol)
    {
        return notifyoptions.sites[protocol + url];
    }
    this.changedefnotify = function (email, nwo, nbo,baloon)
    {
        notifyoptions.default.nbo = nbo;
        notifyoptions.default.nwo = nwo;
        notifyoptions.default.email = email;
        notifyoptions.default.baloon = baloon;
        fs.writeFile('./notify.json', JSON.stringify(notifyoptions), function (err)
        {
            if (err) alert("error when changing default notify options:(when writing to database)" + err);
        });
    }
    this.getdefnotify = function ()
    {
        return JSON.parse(JSON.stringify(notifyoptions.default));
    }
    this.switchmonitoring = function (on)
    {
        for (var i = 0; i < childs.length; i++)
        {
            childs[i].send({ type: "monitoring", data: { turnon: on } });
        }
    }
    this.editsite = function (url, protocol, checkinterval, newurl, newprotocol, newcheckinterval, newtimeout, cb)
    {
        fs.readFile("./sites.json", "utf8", function (err, data)
        {
            if (err) alert("error when editing site:(when reading from database)" + err);
            else
            {
                var data = JSON.parse(data);
                for (var i = 0; i < data.sites.length; i++)
                {
                    if (data.sites[i].url == url && data.sites[i].protocol == protocol)
                    {
                        
                        localStorage.setItem(newprotocol + newurl + "laston", localStorage.getItem(data.sites[i].protocol+data.sites[i].url + "laston"));
                        localStorage.removeItem(data.sites[i].protocol + data.sites[i].url + "laston");
                        childs[obj_sites[data.sites[i].protocol + data.sites[i].url].id].send({ type: "editsite", data: { url: url, protocol: protocol, checkinterval: checkinterval, newurl: newurl, newprotocol: newprotocol, newcheckinterval: newcheckinterval, newtimeout: newtimeout } });
                        childs[0].send({ type: "editsite", data: { url: url, protocol: protocol, checkinterval: checkinterval, newurl: newurl, newprotocol: newprotocol, newcheckinterval: newcheckinterval, newtimeout: newtimeout } });
                        var siteprevdata=JSON.parse(JSON.stringify(obj_sites[data.sites[i].protocol + data.sites[i].url]));
                        obj_sites[data.sites[i].protocol + data.sites[i].url]=undefined;
                        obj_sites[newprotocol + newurl]=siteprevdata;
                        data.sites[i].url = newurl;
                        data.sites[i].protocol = newprotocol;
                        data.sites[i].checkinterval = newcheckinterval;
                        data.sites[i].timeout = newtimeout;
                        fs.writeFile('./sites.json', JSON.stringify(data), function (err)
                        {
                            if (err) alert("error when editing site:(when writing to database)" + err);
                            else
                                cb(true);
                        });
                        return;
                    }
                }

            }
        });
    }
    this.addsite = function (url, protocol, checkinterval, timeout, cb)
    {
        siteexist(url, protocol, function (r)
        {
            if (r)
            {
                cb(false);
            }
            else
            {
                addsite(url, protocol, checkinterval, timeout);
                cb(true);
            }
        });
    }
    function getsites(cb)
    {
        fs.readFile("./sites.json", "utf8", function (err, data)
        {
            if (err) alert("error when getting sit list:(when reading from database)" + err);
            else
            {
                cb(JSON.parse(JSON.stringify(JSON.parse(data).sites)));
            }
        });
    }
    function addsite(url, protocol, checkinterval, timeout)
    {
        fs.readFile("./sites.json", "utf8", function (err, data)
        {
            if (err) alert("error when adding site:(when reading from database)" + err);
            else
            {
                var data = JSON.parse(data);
                localStorage.setItem(protocol+url + "laston", true);
                data.sites.push({ url: url, protocol: protocol, checkinterval: checkinterval, timeout: timeout });

                fs.writeFile('./sites.json', JSON.stringify(data), function (err)
                {
                    if (err) alert("error when adding site:(when writing to database)" + err);
                });
                var siteid = Math.min(obj_idpid.length - 1, Math.floor(Math.random() * (obj_idpid.length - 1)) + 1);

                var sitepid = obj_idpid[siteid];
                obj_idpid[siteid] = String(sitepid);
                obj_pidid[sitepid].sites.push({ url: url, protocol: protocol, checkinterval: checkinterval, timeout: timeout });
                obj_sites[protocol + url] = { pid: sitepid, id: siteid };
                childs[siteid].send({ type: "newsite", data: { url: url, protocol: protocol, checkinterval: checkinterval, timeout: timeout } });
                childs[0].send({ type: "newsite", data: { url: url, protocol: protocol, checkinterval: checkinterval, timeout: timeout } });
            }
        });
    }
    function removesite(url, protocol)
    {
        fs.readFile("./sites.json", "utf8", function (err, data)
        {
            if (err) alert("error when removing site:(when reading from database)" + err);
            else
            {
                var data = JSON.parse(data);
                for (var i = 0; i < data.sites.length; i++)
                {
                    if (data.sites[i].url == url && data.sites[i].protocol == protocol)
                    {
                        localStorage.removeItem(data.sites[i].protocol+data.sites[i].url + "laston");
                        childs[obj_sites[data.sites[i].protocol + data.sites[i].url].id].send({ type: "deletesite", data: { url: data.sites[i].url, protocol: data.sites[i].protocol } });
                        childs[0].send({ type: "deletesite", data: { url: data.sites[i].url, protocol: data.sites[i].protocol } });
                        data.sites.splice(i, 1);
                        fs.writeFile('./sites.json', JSON.stringify(data), function (err)
                        {
                            if (err) alert("error when removing site:(when writing to database)" + err);
                        });
                        return;
                    }
                }

            }
        });
    }
    function siteexist(url, protocol, cb)
    {
        fs.readFile("./sites.json", "utf8", function (err, data)
        {
            if (err) alert("error when checking if site exist:(when reading from database)" + err);
            else
            {
                var data = JSON.parse(data);
                data = data.sites;
                for (var i = 0; i < data.length; i++)
                {
                    if (data[i].url == url && data[i].protocol == protocol)
                    {
                        cb(true);
                        return;
                    }
                }
                cb(false);
            }
        });
    }
    this.removesite = removesite;
    return this;
})();
