var reqs = [];
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
    update();
    $("*").click(function (e)
    {
        e.preventDefault();
    });
});
var firstajax = true;
function update()
{
    $.ajax({
        url: "ajax", data: JSON.stringify(reqs.length > 0 ? { updates: reqs } : {}), method: "POST", contentType: 'application/json', processData: false, success: function (res)
        {
            if (res.body || res.websites)
            {
                var selected = $(document.activeElement).getPath();
                if (res.body)
                {
                    $("#bodycontainer").html(res.body);
                    console.log("body");
                }
                if (res.websites)
                {
                    console.log("websites");
                    $("#websiteslistcontainer").html(res.websites);
                }
                $(selected).focus();
                $("input").on("input", function ()
                {
                    $(this).blur(function ()
                    {
                        reqs.push({ type: "inputupdate", data: { id: $(this).getPath(), val: $(this).val() } });
                    });
                    
                });
                $('select').on("change", function ()
                {
                    reqs.push({ type: "inputupdate", data: { id: $(this).getPath(), val: $(this).val() } });
                });
            }
            setTimeout(update, 300);
            
            if (res.changes)
                for (var i = 0; i < res.changes.length; i++)
                {
                    eval(res.changes[i]);
                }
            if (firstajax)
            {
                $("#bodycontainer").click(function (e)
                {
                    reqs.push({ type: "click", data: { x: e.clientX - (innerWidth - parseInt($("#bodycontainer").css("width"))) / 2, y: e.clientY - (innerHeight - parseInt($("#bodycontainer").css("height"))) / 2 } })
                });
                $("#bodycontainer").mousedown(function (e)
                {
                    reqs.push({ type: "mousedown", data: { x: e.clientX - (innerWidth - parseInt($("#bodycontainer").css("width"))) / 2, y: e.clientY - (innerHeight - parseInt($("#bodycontainer").css("height"))) / 2 } })
                });
                firstajax = false;
                reloadStylesheets();
            }
            
        },
        error: function () { alert("Error accoured updating window data, refresh to connect again") }
    });
    reqs = [];
}
function wrap(el, wrapper)
{
    el.parentNode.insertBefore(wrapper, el);
    wrapper.appendChild(el);
}
function reloadStylesheets()
{
    var queryString = '?reload=' + new Date().getTime();
    $('link[rel="stylesheet"]').each(function ()
    {
        this.href = this.href.replace(/\?.*|$/, queryString);
    });
}