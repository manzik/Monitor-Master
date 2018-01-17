webportal = new (function ()
{
    window.addEventListener("resize", function ()
    {
        for(var key in sessions)
        {
            sessions[key].updates.push('$("#bodycontainer").css({"width":"' + (innerWidth) + 'px","height":"' + (innerHeight) + 'px"})');
        }
    });
    var express = require('express');
    var basicAuth = require('basic-auth-connect');
    var bodyParser = require('body-parser');
    var compression = require('compression');
    var session = require('express-session');
    var app = express();

    this.running = false;
    var servers = [];
    var auth;
    this.updates = [];
    String.prototype.insert = function (index, string)
    {
        if (index > 0)
            return this.substring(0, index) + string + this.substring(index, this.length);
        else
            return string + this;
    };
    var lsource;
    var sessions = {};
    this.init = function ()
    {
        auth = basicAuth(function (user, pass, callback)
        {
            var result = (user === localStorage.getItem("portaluser") && pass === localStorage.getItem("portalpass"));
            callback(null, result);
        });
        app.use("/js", auth, express.static(__dirname));
        app.use("/css", auth, express.static(__dirname + "/../css"));
        app.use("/img", auth, express.static(__dirname + "/../img"));
        app.use(bodyParser.json());
        app.use(bodyParser());
        app.use(bodyParser.urlencoded({ extended: true }));
        app.use(compression());
        app.use(session({
            secret: 'JHSCHYUWELOC'
        }))
        //app.use(multer());
        app.get('/', auth, function (req, res)
        {
            sessions[req.sessionID] = { updates: [], lsource: "", weblsource: undefined, notweblsource: undefined };
            var source = document.documentElement.outerHTML;
            //while (source.indexOf("<script") > -1)
            //{
            //    source = source.replace(source.substr(source.indexOf("<script"), source.indexOf("</script>", source.indexOf("<script") + 5) + ("</script>").length + ("<script").length), "");
            //}
            source = source.replace("<script>window.$ = window.jQuery = require('./js/jquery/jquery-2.2.3.min.js');</script>", "<script src=\"js/jquery/jquery-2.2.3.min.js\"></script>")
                .replace("<script>moment = require('./js/daterangepicker/moment.min.js');</script>", "<script src=\"js/daterangepicker/moment.min.js\"></script>")
            .replace("<script>require('./js/daterangepicker/daterangepicker.js');</script>", "<script src=\"js/daterangepicker/daterangepicker.js\"></script>")
            .replace("<script src=\"js/main.js\"></script>", "<script src=\"js/webportal/wp.js\"></script>");
            sessions[req.sessionID].updates.push('(function(){org_html = document.getElementsByTagName("body")[0].innerHTML;new_html = "<div id=\'bodycontainer\' style=\'border:solid 1px rgb(30,30,30);transform:translateX(-50%) translateY(-50%);left:50%;top:50%;position:fixed;\'>" + org_html + "</div>";document.getElementsByTagName("body")[0].innerHTML = new_html;})()', '$("#bodycontainer").css({"width":"' + (innerWidth) + 'px","height":"' + (innerHeight) + 'px"})');
            res.send(source);
        });
        app.post('/ajax', auth, function (req, res)
        {
            var body = req.body;
            if (body.updates)
                for (var i = 0; i < body.updates.length; i++)
                {
                    if (body.updates[i].type == "click")
                    {
                        try
                        {
                            if ($(document.elementFromPoint(body.updates[i].data.x, body.updates[i].data.y)).prop("tagName") == "path")
                            {
                                $($(document.elementFromPoint(body.updates[i].data.x, body.updates[i].data.y)).parent()).parent()[0].click();
                            }
                            else
                                document.elementFromPoint(body.updates[i].data.x, body.updates[i].data.y).click();
                        }
                        catch (e)
                        {
                            console.log("error: " + e);
                        }
                    }
                    else
                        if (body.updates[i].type == "mousedown")
                        {
                            function triggerMouseEvent(node, eventType)
                            {
                                var clickEvent = document.createEvent('MouseEvents');
                                clickEvent.initEvent(eventType, true, true);
                                node.dispatchEvent(clickEvent);
                            }
                            triggerMouseEvent(document.elementFromPoint(body.updates[i].data.x, body.updates[i].data.y), "mousedown");
                        }
                        else
                            if (body.updates[i].type == "inputupdate")
                            {
                                try
                                {
                                    $(body.updates[i].data.id).val(body.updates[i].data.val);
                                    $(body.updates[i].data.id).change();
                                }
                                catch (e)
                                {
                                    console.log("error: " + e);
                                }
                            }
                }
            res.contentType('json');
            $("input").each(function ()
            {
                if ($(this).attr("type") != "checkbox")
                    $(this).attr("value", $(this).val());
                else
                    $(this).attr("checked", $(this).prop("checked"));
            });
            $("select").each(function ()
            {
                var name = $(this).val();
                $($(this).children()).each(function ()
                {
                    if ($(this).attr("value") == name)
                        $(this).attr("selected", "selected");
                    else
                        $(this).removeAttr("selected");
                });
            });
            var websource = $("#websiteslistcontainer").get()[0].outerHTML;
            
            var nsource = document.body.outerHTML;
            var notwebsource = nsource.substr(0, nsource.indexOf(websource)) + nsource.substr(websource.length + nsource.indexOf(websource));
            var resy = {};
            if (nsource !== sessions[req.sessionID].lsource)
            {
                if (sessions[req.sessionID].notweblsource === notwebsource)
                {
                    resy.websites = websource;
                }
                else
                {
                    resy.body = nsource;
                }
            }
            
            
            if (sessions[req.sessionID].updates.length > 0)
                resy.changes = sessions[req.sessionID].updates;
            res.send(resy);
            sessions[req.sessionID].updates = [];
            sessions[req.sessionID].lsource = nsource;
            sessions[req.sessionID].notweblsource = notwebsource;
            sessions[req.sessionID].weblsource = websource;
        });
    }
    this.toggle = function (enable)
    {
        enable = enable === null ? false : enable == "true" ? true : enable;
        if (!enable)
        {
            if (this.running)
            {
                closeservers();
            }
        }
        else
        {
            setserver(localStorage.getItem("portalport"));
        }
        this.running = enable;
    }
    function setserver(port)
    {
        server = app.listen(port);

        server.on('connection', function (socket)
        {
            socket.id = Date.now() + Math.random();
            server.sockets.push(socket);
            (function (socket) { socket.on("close", function () { for (var i = 0; i < server.sockets.length; i++) { if (server.sockets[i].id == socket.id) { server.sockets.splice(i, 1); return; } } }) })(socket);
        });
        server.sockets = [];

    }
    function closeservers()
    {
        server.close(function ()
        {
        });

        // Add this part to manually destroy all the connections.
        server.sockets.forEach(function (socket)
        {
            socket.destroy();
        });
    }
    this.changeport = function ()
    {
        if (this.running)
        {
            closeservers();
        }
        setserver(localStorage.getItem("portalport"));
    }
});