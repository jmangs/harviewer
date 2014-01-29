(function () {
    function onHarLoaded(event) {
        var model = event.target.repObject.model;

        $('.pageTable').css({ width: '50%', 'float': 'left' });

        var pages = model.input.log.pages;
        if (pages.length == 2) {
            var logEntries = model.input.log.entries;
            var queryString = (getURLParameter("queryString", 'false') === 'true');
            var sort = (getURLParameter("sort", 'true') === 'true');

            // Determine the spacing of the entries
            var urls = [[], []];
            var diffs = [[],[]];

            var entriesSize = logEntries.length;
            for (var i = 0; i < entriesSize; i++) {
                var entry = logEntries[i];
                url = entry.request.url;
                if (queryString === false)
                    url = url.split("?")[0];
                if (entry.pageref === pages[0].id) {
                    if (url in urls[0] === false)
                        urls[0][url] = [];
                    urls[0][url].push(entry);
                    diffs[0].push(url);
                }
                else if (entry.pageref === pages[1].id) {
                    if (url in urls[1] === false)
                        urls[1][url] = [];
                    urls[1][url].push(entry);
                    diffs[1].push(url);
                }
            }

            if(sort) {
                diffs[0].sort();
                diffs[1].sort();
            }

            // Set the difference thresholds
            var timing_multiplier = 1.25;
            var timing_threshold = 20.0;
            var size_multiplier = 1.6;

            // Insert blank rows, highlight changed rows
            var blanks = [0, 0];
            var diffs = diffArrays2(diffs[0], diffs[1]);
            var diffSize = diffs[0].length;

            for (i = 0; i < diffSize; i++) {
                if (diffs[0][i] === null) {
                    $($($("table.pageTable")[0]).find("tr.netRow")[i - blanks[0]++]).before(
                        "<tr class='diff-spacer'><td colspan='6'>&nbsp;</td></tr>"
                    );
                }
                if (diffs[1][i] === null) {
                    $($($("table.pageTable")[1]).find("tr.netRow")[i - blanks[1]++]).before(
                        "<tr class='diff-spacer'><td colspan='6'>&nbsp;</td></tr>"
                    );
                }

                var url = diffs[0][i] || diffs[1][i];
                var entries = [
                    url in urls[0] ? urls[0][url].shift() : undefined,
                    url in urls[1] ? urls[1][url].shift() : undefined
                ];

                var rows = $("table.netTable tr:nth-child(" + (parseInt(i, 10) + 2) + ")");

                if (entries[0] && entries[1]) {

                    if (rows.filter('.diff-spacer').length === 1) {
                        rows.filter('.diff-spacer').addClass('diff-moved');
                        var targets = $("table.pageTable:eq(1) tr.netRow:not(.diff-moved,.diff-changed,.diff-added,.diff-removed)");
                        var t_l = targets.length;

                        for (var t = 0; t < t_l; t++) {
                            var targetUrl = $(targets[t]).find(".netFullHrefLabel").text();
                            if (queryString === false)
                                targetUrl = targetUrl.split("?")[0];
                            if (url === targetUrl || decodeURIComponent(url) === targetUrl)
                                break;
                        }

                        rows[1] = targets[t];
                    }

                    var change_detected = false;

                    if (entries[0].response.status !== entries[1].response.status) {
                        change_detected = true;
                        rows.find(".netStatusLabel").addClass('diff-highlight');
                    }
                    if (
                        (entries[0].timings.blocked * timing_multiplier + timing_threshold < entries[1].timings.blocked) ||
                            (entries[0].timings.connect * timing_multiplier + timing_threshold < entries[1].timings.connect) ||
                            (entries[0].timings.dns * timing_multiplier + timing_threshold < entries[1].timings.dns) ||
                            (entries[0].timings.receive * timing_multiplier + timing_threshold < entries[1].timings.receive) ||
                            (entries[0].timings.send * timing_multiplier + timing_threshold < entries[1].timings.send) ||
                            (entries[0].timings.ssl * timing_multiplier + timing_threshold < entries[1].timings.ssl) ||
                            (entries[0].timings.wait * timing_multiplier + timing_threshold < entries[1].timings.wait) ||
                            (entries[1].timings.blocked * timing_multiplier + timing_threshold < entries[0].timings.blocked) ||
                            (entries[1].timings.connect * timing_multiplier + timing_threshold < entries[0].timings.connect) ||
                            (entries[1].timings.dns * timing_multiplier + timing_threshold < entries[0].timings.dns) ||
                            (entries[1].timings.receive * timing_multiplier + timing_threshold < entries[0].timings.receive) ||
                            (entries[1].timings.send * timing_multiplier + timing_threshold < entries[0].timings.send) ||
                            (entries[1].timings.ssl * timing_multiplier + timing_threshold < entries[0].timings.ssl) ||
                            (entries[1].timings.wait * timing_multiplier + timing_threshold < entries[0].timings.wait)
                        ) {
                        change_detected = true;
                        rows.find(".netTimeLabel").addClass('diff-highlight');
                    }
                    if (
                        (entries[0].response.bodySize * size_multiplier < entries[1].response.bodySize) ||
                            (entries[1].response.bodySize * size_multiplier < entries[0].response.bodySize)
                        ) {
                        change_detected = true;
                        rows.find(".netSizeLabel").addClass('diff-highlight');
                    }
                    if (queryString === false && entries[0].request.url !== entries[1].request.url) {
                        change_detected = true;
                        rows.find(".netHrefLabel:not(.netFullHrefLabel)").addClass('diff-highlight');
                    }
                    if (change_detected === true)
                        rows.addClass('diff-changed');
                }
                else if (entries[1]) {
                    rows.addClass('diff-added');
                }
                else if (entries[0]) {
                    rows.addClass('diff-removed');
                }
                else {
                    $($("table.pageTable:eq(0) tr")[parseInt(i, 10) + 3]).addClass('diff-moved');
                }
            }

            // Ensure each row is the same height as the one directly across from it
            $(".netTable > tbody > tr:nth-child(1n+2)").height($($(".netRow")[1]).height());

            // Make clicks occur on both sides of the table
            $(".netTable > tbody > tr:nth-child(1n+2)").click(function (e1) {
                if (e1.originalEvent.custom === undefined) {
                    var e2;
                    if (document.createEvent) {
                        e2 = document.createEvent("MouseEvents");
                        e2.initMouseEvent(
                            e1.type, e1.bubbles, e1.cancelable, e1.view, e1.detail,
                            e1.screenX, e1.screenY, e1.clientX, e1.clientY,
                            e1.ctrlKey, e1.altKey, e1.shiftKey, e1.metaKey,
                            e1.button, e1.relatedTarget
                        );
                        e2.custom = true;
                    }
                    else if (document.createEventObject) {
                        e2 = document.createEventObject();
                        e2.custom = true;
                    }
                    $(".netTable:eq(" + (($($(this).parents()[5]).index() + 1) % 2) + ") > tbody > tr:nth-child(" + ($(this).prevAll().length + 1) + ") div.netDomainLabel").each(function () {
                        if (this.dispatchEvent)
                            this.dispatchEvent(e2);
                        else if (this.fireEvent)
                            this.fireEvent('onclick', e2);
                    });
                }
            });

            // remove expand/collapse buttons
            $('tr.pageRow').remove();
        }
    };

    function getURLParameter(name, fallback)
    {
        var query = window.location.search.substring(1);
        var vars = query.split("&");
        for (var i=0;i<vars.length;i++)
        {
            var pair = vars[i].split("=");
            if (pair[0] == name)
                return pair[1];
        }
        return fallback;
    }

    function diffArrays2(a1, a2) {
        var b1 = [];
        var b2 = [];

        var i1 = 0;
        var i2 = 0;

        while (i1 < a1.length && i2 < a2.length) {
            if (a1[i1] === a2[i2]) {
                b1.push(a1[i1++]);
                b2.push(a2[i2++]);
            }
            else {
                var r1 = $.inArray(a1[i1], a2);
                var r2 = $.inArray(a2[i2], a1);
                if (r1 && r1 > i2) {
                    while (i2 < r1) {
                        b1.push(null);
                        b2.push(a2[i2++]);
                    }
                }
                else if (r2 && r2 > i1) {
                    while (i1 < r2) {
                        b1.push(a1[i1++]);
                        b2.push(null);
                    }
                }
                else {
                    b1.push(a1[i1++]);
                    b1.push(null);
                    b2.push(null);
                    b2.push(a2[i2++]);
                }
            }
        }
        while (i1 < a1.length) {
            b1.push(a1[i1++]);
            b2.push(null);
        }
        while (i2 < a2.length) {
            b1.push(null);
            b2.push(a2[i2++]);
        }

        console.log(b1.length + " < > " + b2.length);
        return [b1, b2];
    }

    if (getURLParameter('diff', 'false') === 'true') {
        $("#content").bind("onViewerHARLoaded", onHarLoaded).bind("onPreviewHARLoaded", onHarLoaded);
    }
})();
