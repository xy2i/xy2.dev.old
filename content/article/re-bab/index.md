+++
title = "How an anti ad-blocker works: Reverse-engineering BlockAdBlock"
date = 2020-03-26T08:49:10+01:00
categories = ["Reverse Engineering"]
tags = []
draft = false

summary = "How I reversed an ad-blocker blocker and learned some history about ad-blocking."
singleCSS = true  
+++

If you've used an adblocker, you may have seen [BlockAdBlock](https://blockadblock.com/). 
This script detects your ad-blocker and disables website access until you deactivate your adblocker.
But I found myself wondering how it worked.
How does an anti ad-blocker detect adblockers?
And how do adblockers react and block ad-block-blockers?

## Reverse-engineering through time

The first thing I did was look at [their site](https://blockadblock.com/configure.php).
BlockAdBlock offers a configurator that allows to specify how long to wait, and how the script even appeared, creating different _versions_ of the script.

And this got me thinking about versions. What if I could not look at one version, but **all** of them? So I did. I went back in time, using the **[Wayback Machine](https://archive.org/web/)**.
After I downloaded all versions, I took a look and hashed them:

{{<details-code-block 
summary="The list of all BlockAdBlock versions, with `sha1sum`. _<small>Click to unroll!</small>_"
aside="Only _six_ payloads are different, and there are no updates in **four** years."
>}}
``` plaintext {hl_lines=[1,2,3,4,9,10],linenos=false}
6d5eafab2ca816ccd049ad8f796358c0a7a43cf3  20151007203811.js
065b4aa813b219abbce76ad20a3216b3481b11bb  20151113115955.js
d5dec97a775b2e563f3e4359e4f8f1c3645ba0e5  20160121132336.js
8add06cbb79bc25114bd7a2083067ceea9fbb354  20160318193101.js
8add06cbb79bc25114bd7a2083067ceea9fbb354  20160319042810.js
8add06cbb79bc25114bd7a2083067ceea9fbb354  20160331051645.js
8add06cbb79bc25114bd7a2083067ceea9fbb354  20160406061855.js
8add06cbb79bc25114bd7a2083067ceea9fbb354  20160408025028.js
555637904dc9e4bfc6f08bdcae92f0ba0f443ebf  20160415083215.js
d8986247cad3bbc2dd92c3a2a06ac1540da6b286  20161120215354.js
d8986247cad3bbc2dd92c3a2a06ac1540da6b286  20170525201720.js
d8986247cad3bbc2dd92c3a2a06ac1540da6b286  20170606090847.js
d8986247cad3bbc2dd92c3a2a06ac1540da6b286  20170703211338.js
d8986247cad3bbc2dd92c3a2a06ac1540da6b286  20170707211652.js
d8986247cad3bbc2dd92c3a2a06ac1540da6b286  20170813090718.js
d8986247cad3bbc2dd92c3a2a06ac1540da6b286  20170915094808.js
d8986247cad3bbc2dd92c3a2a06ac1540da6b286  20171005180631.js
d8986247cad3bbc2dd92c3a2a06ac1540da6b286  20171019162109.js
d8986247cad3bbc2dd92c3a2a06ac1540da6b286  20171109101135.js
d8986247cad3bbc2dd92c3a2a06ac1540da6b286  20171127113945.js
d8986247cad3bbc2dd92c3a2a06ac1540da6b286  20171211042454.js
d8986247cad3bbc2dd92c3a2a06ac1540da6b286  20171227031408.js
d8986247cad3bbc2dd92c3a2a06ac1540da6b286  20180202000800.js
d8986247cad3bbc2dd92c3a2a06ac1540da6b286  20180412213253.js
d8986247cad3bbc2dd92c3a2a06ac1540da6b286  20180419060636.js
d8986247cad3bbc2dd92c3a2a06ac1540da6b286  20180530223228.js
d8986247cad3bbc2dd92c3a2a06ac1540da6b286  20180815042610.js
d8986247cad3bbc2dd92c3a2a06ac1540da6b286  20181029233809.js
d8986247cad3bbc2dd92c3a2a06ac1540da6b286  20181122190948.js
d8986247cad3bbc2dd92c3a2a06ac1540da6b286  20181122205748.js
d8986247cad3bbc2dd92c3a2a06ac1540da6b286  20190324081812.js
d8986247cad3bbc2dd92c3a2a06ac1540da6b286  20190420155244.js
d8986247cad3bbc2dd92c3a2a06ac1540da6b286  20190424200651.js
d8986247cad3bbc2dd92c3a2a06ac1540da6b286  20190903121933.js
d8986247cad3bbc2dd92c3a2a06ac1540da6b286  20200112084838.js
```
{{</details-code-block>}}

There were six versions, and the last one is from 2016, although I still see sites using BlockAdBlock today. 
This is a huge win, because we can reverse the script once, then reverse each <abbr title="Difference between two files, here between our versions">diff</abbr>. We can see scrapped ideas and even leftover debug code. 

You can find [each version on GitHub](https://github.com/xy2iii/BlockAdBlock-reversed).
If you'd like to look at each diff, see [this repository](https://github.com/xy2iii/bab-history) where each commit is a different version. <small>I'll include links to the source for each section of this reversing, don't worry.</small>

## Unpacking

As we look at the code, we find that it is not minified, but instead packed by a [JS packer](http://dean.edwards.name/packer/) by Dean Edwards.[^unpacker]

{{<details-code-block 
summary="Dean Edwards' [packer](http://dean.edwards.name/packer/) in BlockAdBlock: only an argument's name changes."
aside="p,a,c,k,e,r becomes p,a,c,k,e,d. There is no other modification to the logic."
open=true
>}}
``` js
eval(function(p, a, c, k, e, d) {
    e = function(c) {
        return (c < a ? '' : e(parseInt(c / a))) + ((c = c % a) > 35 ? String.fromCharCode(c + 29) : c.toString(36))
    };
    if (!''.replace(/^/, String)) {
        while (c--) {
            d[e(c)] = k[c] || e(c)
        }
        k = [function(e) {
            return d[e]
        }];
        e = function() {
            return '\\w+'
        };
        c = 1
    };
    while (c--) {
        if (k[c]) {
            p = p.replace(new RegExp('\\b' + e(c) + '\\b', 'g'), k[c])
        }
    }
    return p
}('0.1("2 3 4 5 6 7 8\'d. 9, h? a b c d e f g");i j=\'a\'+\'k\'+\'e\'+\'l\'+\'n\'+\'m\'+\'e\';',24,24,
'console|log|This|code|will|get|unpacked|then|eval|Cool||||||||huh|let|you|w|s||o'.split('|'),0,{}))
```
{{</details-code-block>}}

Thankfully, we don't have to worry about this.
The packer's  weakness is that any code it unpacks must be passed to `eval()`. 
If we replace the `eval()` with something like `console.log()`, suddently we get the whole source code and the packer is defeated.[^eval->log]

Once we've done that for each version, we can examine each version, as well as the added features over the years.

<div class="d3-map"></div>

## Version 1 (? - November 2015): initial script

{{<re-bab/github>}}
[Source code](https://github.com/xy2iii/BlockAdBlock-reversed/blob/master/v1-reversed.js)
{{</re-bab/github>}}

We start by taking a look at `20151007203811.js`, around November 2015.[^script-dates] Although this first version does very little adblock-blocking, it allows us to take a look at BlockAdBlock's architecture, without the cruft that accumulated over the years.

### Architecture

In three sentences:
* BlockAdBlock is a closure returning an object with three functions: 
    - `bab()`, which sets up bait most of the time, calling `check`
    - `check()`, which checks if the adblocker blocked the bait, calling `arm`
    - `arm()`, which creates the overlay.
* The entrypoint, `bab()`, is then fired after a set amount of time.
* The three returned functions are generated with arguments from the closure, which are set in the [BlockAdBlock customizer](https://blockadblock.com/configure.php).

{{<details-code-block 
summary="The code is built around a closure, assigned to a global object with a random name."
aside="There is great care in the code to have most names generated randomly, so as to avoid static blocking."
open=true
>}}
```js
var randomID = '',
    e = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
for (var i = 0; i < 12; i++) randomID += 
    e.charAt(Math.floor(Math.random() * e.length));
var setTimeoutDelay = 7; // Delay after which to call BlockAdBlock
window['' + randomID + ''] = ...
```
{{</details-code-block>}}

{{<details-code-block 
summary="It returns a three-function object: `bab`, `check` and `arm`."
aside="bab, check and arm are my own names. All variables were minified, and some were intentionally obfuscated."
open=true
>}}
``` js
window['' + randomID + ''] = (function() {
    var eid = ...
    return {
        bab: function(check, passed_eid) {},
        check: function(checkPredicate, unused) {},
        arm: function() {}
    }
})();
```
{{</details-code-block>}}

{{<details-code-block 
summary="The entrypoint, `bab()`, is called via `setTimeout()`."
aside="bab_elementid is unused in all versions of the code. `setTimeout` is passed a string."
open=true
>}}
``` js
setTimeout('window[\'\' + randomID + \'\'] \
.bab(window[\'\' + randomID + \'\'].check, \
     window[\'\' + randomID + \'\'].bab_elementid)', setTimeoutDelay * 1000);
```
{{</details-code-block>}}

The closure has outer variables. Two of them serve to keep state in the script:
* `adblockDetected` is 1 if an adblocker is detected.
* `nagMode` is a customization option. If set, the script will only nag you once to disable your adblocker, rather than block access.

{{<details-code-block 
summary="Other outer variables in the closure control apparence and behavior, set in the [customizer](https://blockadblock.com/configure.php)."
aside="bab_domain is set here to try to obfuscate the BlockAdBlock domain."
>}}
``` js
var eid = ' ad_box', // Name of the bait.
    __u1 = 1, // Unused.

    // Colors for the blockadblock prompt.
    overlayColor = '#EEEEEE',
    textColor = '#777777',
    buttonBackgroundColor = '#adb8ff',
    buttonColor = '#FFFFFF',

    __u2 = '', // Unused.

    // Text to display when the blockadblock prompt is shown.
    welcomeText = 'Sorry for the interruption...',
    primaryText = 'It looks like you\'re using an ad blocker. That\'s okay.  Who doesn\'t?',
    subtextText = 'But without advertising-income, we can\'t keep making this site awesome.',
    buttonText = 'I understand, I have disabled my ad blocker.  Let me in!',

    // If 1, adblock was detected.
    adblockDetected = 0,
    // If 1, BlockAdBlock will only nag the visitor once, rather than block access.
    nagMode = 0,

    // The blockadblock domain, reversed.
    bab_domain = 'moc.kcolbdakcolb';
```
{{</details-code-block>}}

### `bab`: bait ad creation

BlockAdBlock's central detection method is by creating "bait" ad elements, that look like real ads. 
It then checks if the adblocker blocked them.

{{<details-code-block 
summary="A bait is created: a fake div pretending to be an ad, but hidden out of view."
aside="passed_eid is presumably to customise the id of the bait, but it's unused."
open=true
>}}
``` js
bab: function(check, passed_eid) {
    // Wait for the document to be ready.
    if (typeof document.body == 'undefined') {
        return
    };

    var delay = '0.1', 
        passed_eid = eid ? eid : 'banner_ad',
        bait = document.createElement('DIV');
        
    bait.id = passed_eid;
    bait.style.position = 'absolute';
    bait.style.left = '-999px';
    bait.appendChild(document.createTextNode(' '));
    document.body.appendChild(bait);
    ...
```
{{</details-code-block>}}

{{<details-code-block 
summary="Afterwards, `check` if the bait was removed by the adblocker."
aside="If the bait doesn't exist anymore, then the element was removed (and we trigger the overlay)."
open=true
>}}
``` js
    ...
    setTimeout(function() {
        if (bait) {
            check((bait.clientHeight == 0), delay);
            check((bait.clientWidth == 0), delay);
            check((bait.display == 'hidden'), delay);
            check((bait.visibility == 'none'), delay);
            check((bait.opacity == 0), delay);
            check((bait.left < 1000), delay);
            check((bait.top < 1000), delay)
        } else {
            check(true, delay)
        }
    }, 125)
}
```
{{</details-code-block>}}

{{<details-code-block 
summary="`check` will trigger if the predicate was true, and trigger `arm`."
aside="Because `check` triggers multiple times as seen above, `adblockDetected` is set on the first correct check, in order to avoid triggering `arm` multiple times."
open=true
>}}
``` js
check: function(checkPredicate, unused) {
    if ((checkPredicate) && (adblockDetected == 0)) {
        adblockDetected = 1;
        window['' + randomID + ''].arm()
    } else {}
}
```
{{</details-code-block>}}

### Nag mode

BlockAdBlock has an feature called "nag mode": in this mode, BlockAdBlock will only tell you to remove your adblocker once, instead of blocking you on each visit. 
It does so by setting a `localStorage` item after the first visit. 

If we could set this for every, could we bypass BlockAdBlock forever? Unfortunately, BlockAdBlock checks beforehand if the script has been configured to nag mode, so this won't work for default usage, which is to block every time.

{{<details-code-block 
summary="The start of `arm`, checking for nag mode."
aside="`nagMode` is set by the customizer, and is 0 by default. :("
open=true
>}}
``` js {hl_lines=[2]}
arm: function() {
    if (nagMode == 1) {
        var babNag = sessionStorage.getItem('babn');
        if (babNag > 0) {
            return true // Stop the script.
        } else {
            sessionStorage.setItem('babn', (Math.random() + 1) * 1000)
        }
    };
    ...
```
{{</details-code-block>}}

### Blocking BlockAdBlock, version 1

Adblockers work by using what's called filters: lines of code that can block network requests and hide elements on the page. 
By creating "bait" elements, BlockAdBlock triggers these filters on purpose.

With this simple defense, BlockAdBlock works against all major adblockers, like uBlock Origin, AdBlock Plus and Ghostery. To counter against this, we must write our own filter that's active only on BlockAdBlock-enhanced websites.

[Writing adblock filters](https://help.eyeo.com/en/adblockplus/how-to-write-filters) is a bit tricky. 
The kind of filter we need is a **[content filter](https://help.eyeo.com/en/adblockplus/how-to-write-filters#content-filters)**, which blocks elements on the page generated after download. Since the bait ad has an id of `banner_ad`, we create an [element hiding exception](https://help.eyeo.com/en/adblockplus/how-to-write-filters#elemhide_basic), marked `#@#`, for all elements `#` with id `banner_ad`, and put it in our adblocker's custom filter list.

Putting it all together, we get:

{{<details-code-block 
summary="Defeating BlockAdBlock, version 1."
aside="I've used localhost for demonstration, which you can replace with your URL."
open=true
>}}
``` css
localhost#@# #banner_ad
```
{{</details-code-block>}}

This counters BlockAdBlock successfully. The solution may seem basic, but it got the job done for a long time in the [Anti-AdBlock-Killer filter list](https://github.com/reek/anti-adblock-killer/blob/master/anti-adblock-killer-filters.txt#L150).

## Version 2 (November 2015 - January 2016): a few improvements

{{<re-bab/github>}}
[Source code](https://github.com/xy2iii/BlockAdBlock-reversed/blob/master/v2-reversed.js)[v1/v2 diff](https://github.com/xy2iii/bab-history/commit/302e415b5d8d86d1749c6ea5d4b3a1d6fc995eb9#diff-f9901228d7dadbc695e79f98b44125e6)
{{</re-bab/github>}}

### Bait ad creation: less bugs

There's a subtle bug in the first [bait ad creation](#bab-bait-ad-creation) implementation above: the div that's created has no content, so it creates a 0 height by 0 width div.
Later, the code checks if the div was removed if the height and width of the bait div was empty. But since the div had 0 height, BlockAdBlock would always trigger.[^v1-bug-test]

{{<details-code-block 
summary="Fixing the empty div bug."
aside="A child div is created, with some content."
open=true
>}}
``` js
bab: function(...) {
    bait = document.createElement('DIV');
    ...
    bait.appendChild(document.createTextNode('Â '));
```
{{</details-code-block>}}

### Detection via fake image ads

In this method, we create a fake image with a random name on `doubleclick.net`. Adblockers will block the image, thinking it to be an ad's image. However, this requires no change to block in our filter.

{{<details-code-block 
summary="Creating a fake image ad."
aside="`randomStr()` creates a random-length string."
open=true
>}}
``` js
bab: function(...) {
    bait = document.createElement('DIV');
    bait.innerHTML = '<img src="http://doubleclick.net/' + randomStr() + '.jpg">';
    ...
```
{{</details-code-block>}}

The other notable difference is the use of a `setInterval` timer instead of just checking once if the trigger is set. 
It newly checks if the image ad still exists, and if its `src` attribute hasn't been modified, by checking the contents of the bait.

{{<details-code-block 
summary="A new `setInterval`, and checking for the image's existence."
aside="Why `indexof('click')`? The image will look like this: src=\"double**click**.net/abcdefg.jpg\", so we check if that substring still exists."
open=true
>}}
``` js {hl_lines=[10]}
    ...
    checkCallback = setInterval(function() {
        if (bait) {
            check((bait.clientHeight == 0), delay);
            check((bait.clientWidth == 0), delay);
            check((bait.display == 'hidden'), delay);
            check((bait.visibility == 'none'), delay);
            check((bait.opacity == 0), delay);
            try {
                check((document.getElementById('banner_ad').innerHTML.indexOf('click') == -1), delay)
            } catch (e) {}
        } else {
            check(true, delay)
        }
    }, 1000
```
{{</details-code-block>}}

## Version 3 (November 2015 - March 2016): generalized baiting

{{<re-bab/github>}}
[Source code](https://github.com/xy2iii/BlockAdBlock-reversed/blob/master/v3-reversed.js)[v2/v3 diff](https://github.com/xy2iii/bab-history/commit/0cf84eb57a702a78e29d8cf69022a94ad521284b#diff-f9901228d7dadbc695e79f98b44125e6)
{{</re-bab/github>}}

### Bait ad creation: randomized IDs

The only change in this version, though a significant one, is the appearance of randomized IDs for the bait ad. 
A new ID is taken from a list of ad IDs at page load, and is used for the bait ad, now placed in the middle of the page.

{{<details-code-block 
summary="The list of random bait IDs."
aside="A long list that demonstrates significant domain knowledge."
>}}
``` js
var baitIDs = [
  "ad-left",
  "adBannerWrap",
  "ad-frame",
  "ad-header",
  "ad-img",
  "ad-inner",
  "ad-label",
  "ad-lb",
  "ad-footer",
  "ad-container",
  "ad-container-1",
  "ad-container-2",
  "Ad300x145",
  "Ad300x250",
  "Ad728x90",
  "AdArea",
  "AdFrame1",
  "AdFrame2",
  "AdFrame3",
  "AdFrame4",
  "AdLayer1",
  "AdLayer2",
  "Ads_google_01",
  "Ads_google_02",
  "Ads_google_03",
  "Ads_google_04",
  "DivAd",
  "DivAd1",
  "DivAd2",
  "DivAd3",
  "DivAdA",
  "DivAdB",
  "DivAdC",
  "AdImage",
  "AdDiv",
  "AdBox160",
  "AdContainer",
  "glinkswrapper",
  "adTeaser",
  "banner_ad",
  "adBanner",
  "adbanner",
  "adAd",
  "bannerad",
  " ad_box",
  " ad_channel",
  " adserver",
  " bannerid",
  "adslot",
  "popupad",
  "adsense",
  "google_ad",
  "outbrain-paid",
  "sponsored_link"
];
```
{{</details-code-block>}}

{{<details-code-block 
summary="Random ID generation."
aside="As this runs on every load, the bait's ID will be different each time."
open=true
>}}
``` js
    randomBaitID = baitIDs[ Math.floor(Math.random() * baitIDs.length) ],
    ...
    var passed_eid = randomBaitID;
    bait = document.createElement('DIV');    
    bait.id = passed_eid;
```
{{</details-code-block>}}

### Blocking BlockAdBlock, version 3 to latest

BlockAdBlock uses the blind spot of adblockers: if the filter allows all the above IDs, then it also allows genuine ads to pass through. 
If you don't allow blocking the above IDs, then other filters which may use these IDs in their filters to target ads will not work anymore.

In a way, BlockAdBlock is **forcing the adblocker to make itself useless**.

In adblockers, we can run arbitrary JS before anything in the page runs. We could try to delete the BlockAdBlock object prematurely.
But to do that, we need the name of the object BlockAdBlock is attached to, [which is randomized each run,](#architecture) which would require running the code.

uBlock Origin took another approach. The code is ran by `eval`, so what if we could define our own `eval` function that would block execution if we detect BlockAdBlock? In JS the `Proxy` object can accomplish this: any property, affectation and method can be replaced for any object.

This could be bypassed by not `eval`ing the initial BlockAdBlock payload and using it directly, so we also proxy the entrypoint: the `setTimeout` call. Since setTimeout is passed a string and not a function, we check the string.

{{<details-code-block 
summary="Defeating BlockAdBlock in [uBlock Origin (src)](https://github.com/gorhill/uBlock/blob/master/src/web_accessible_resources/nobab.js)."
aside="A list of signatures: identifying patterns of the code. `check` checks an eval'd string against these patterns."
open=true
>}}
``` js
const signatures = [
    [ 'blockadblock' ],
    [ 'babasbm' ],
    [ /getItem\('babn'\)/ ],
    [
        'getElementById',
        'String.fromCharCode',
        'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789',
        'charAt',
        'DOMContentLoaded',
        'AdBlock',
        'addEventListener',
        'doScroll',
        'fromCharCode',
        '<<2|r>>4',
        'sessionStorage',
        'clientWidth',
        'localStorage',
        'Math',
        'random'
    ],
];
const check = function(s) {
    // check for signature 
};
```
{{</details-code-block>}}


{{<details-code-block 
summary="[Proxying](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy) the `eval` and `setTimeout` functions."
aside="If we are executing BlockAdBlock, then clean up."
open=true
>}}
``` js
window.eval = new Proxy(window.eval, {
    apply: function(target, thisArg, args) {
        const a = args[0];
        if ( typeof a !== 'string' || !check(a) ) {
            return target.apply(thisArg, args);
        } 
        // BAB detected: clean up.
        if ( document.body ) {
            document.body.style.removeProperty('visibility');
        }
        let el = document.getElementById('babasbmsgx');
        if ( el ) {
            el.parentNode.removeChild(el);
        }
    }
});
window.setTimeout = new Proxy(window.setTimeout, {
    apply: function(target, thisArg, args) {
        const a = args[0];
        // Check that the passed string is not the BAB entrypoint.
        if (
            typeof a !== 'string' ||
            /\.bab_elementid.$/.test(a) === false
        ) {
            return target.apply(thisArg, args);
        }
    }
});
```
{{</details-code-block>}}

As we are now using a [scriptlet](https://github.com/gorhill/uBlock/wiki/Static-filter-syntax#scriptlet-injection), a custom piece of code ran by the adblocker, the filter changes slightly:

{{<details-code-block 
summary="Defeating BlockAdBlock, all versions: the filter."
aside="This doesn't run by default on every site, for performance reasons, so specify it for each site with the script."
open=true
>}}
``` css
localhost## +js(nobab)
```
{{</details-code-block>}}

## Version 4 (January 2016 - April 2016): experimental features

{{<re-bab/github>}}
[Source code](https://github.com/xy2iii/BlockAdBlock-reversed/blob/master/v4-reversed.js)[v3/v4 diff](https://github.com/xy2iii/bab-history/commit/a497819b713fa94ef7fa202c8fc1e9578cffe784#diff-f9901228d7dadbc695e79f98b44125e6)
{{</re-bab/github>}}

The above detection method was made in [January 2016, according to uBlock Origin commit history](https://github.com/uBlockOrigin/uAssets/blob/91f936dbaeaa681fab4d9259a818458db2200e74/assets/ublock/resources.txt#L493), and has not changed in concept since its inception. 
BlockAdBlock never tried to work around this filter after its creation, by changing its code architecture. Instead, it continued development with more features. And when we go over to the BlockAdBlock page, we see an interesting tab: "Need more anti-adblock power?".

{{<img 
src="bab-advanced-detection" 
alt="Advanced detection">}}

Although those defenses are only available in a special tab, they are included in all scripts and executed by fittingly-named variables. In version 4, two are implemented:
* `aDefOne`, the "specific defense for AdSense sites".
* `aDefTwo`, the "special element defense".

### Accidental debug comments

There's something I should mention before we go. When reversing this version, one function caught my eye:
{{<details-code-block 
summary="A debug `console.log()` that's used in the code!"
aside="This runs only if the global `consolelog` is set, like `window.consolelog = 1`."
open=true
>}}
``` js
function consolelog(e) {
    // "Dev mode" check: developpers of BAB must set window.consolelog to 1.
    if (window.consolelog == 1) {
        console.log(e)
    }
};
```
{{</details-code-block>}}

These debug comments are only available in this version of the code. If I hadn't been reversing each version, I never would have caught it. These comments provide valuable information on how the code works.

### Advanced defense: AdSense

All of these special defenses are put in `check` and not in `arm`, like the architecture would suggest.
This would suggest a change of developer that was perhaps unfamiliar with the codebase.

If AdSense is active on the page, we check that the ads which are supposed to be there still exist. If they're gone because of the adblocker, then BlockAdBlock activates.

{{<details-code-block 
summary="A clever defense: check if existing ads, created by AdSense, are gone."
aside="`scriptExists` will check the entire page for a script with the given URL."
open=true
>}}
``` js {hl_lines=[13,15]}
function check() {
    ...
    var q = 'ins.adsbygoogle',
        // Selects all Google ads in the document.
        adsbygoogleQuery = document.querySelector(q);

    if ((adsbygoogleQuery) && (adblockDetected == 0)) {
        // Ads are not blocked, since the bait ad is still there,
        // and adblockDetected hasn't been set
        if (aDefOne == 'yes') {
            consolelog('case2: standard bait says ads are NOT blocked.');
            var adsbygoogle = '//pagead2.googlesyndication.com/pagead/js/adsbygoogle.js';
            if (scriptExists(adsbygoogle)) {
                consolelog('case2: And Adsense pre-exists.');
                if (adsbygoogleQuery.innerHTML.replace(/\s/g, '').length == 0) {
                    // The ad's content was cleared, so...
                    consolelog('case2: Ads are blocked.');
                    window['' + randomID + ''].arm()
                }
            }
        };
        adblockDetected = 1
    }
    ...
```
{{</details-code-block>}}

The `scriptExists` implementation looks for a given script within the page. In this case, it will detect the Adsense script if it exists.[^reddit-correction]

{{<details-code-block 
summary="Compare the passed script URL against all scripts currently on the page."
aside="Both the compared URL and all the script's URL's are trimmed to 15 characters, though I'm not sure why."
open=true
>}}
``` js {hl_lines=[7]}
function scriptExists(href) {
    if (href) href = href.substr(href.length - 15);
    var scripts = document.getElementsByTagName('script');
    for (var i = scripts.length; i--;) {
        var src = String(scripts[i].src);
        if (src) src = src.substr(src.length - 15);
        if (src === href) return true
    };
    return false
};
```
{{</details-code-block>}}

### Advanced defense: Special element defense

This method, unlike the first one, has a disclaimer: _"Please test after installation to ensure compatibility with your site."_ To contextualize where we are in the code, let's look at `check`: 

{{<details-code-block 
summary="This special defense only triggers if adblock wasn't detected and there is no AdSense script on the page."
aside="This method assumes that owners will only be using AdSense to serve ads on their page: if the AdSense script doesn't exist, there must be something wrong."
open=true
>}}
``` js {hl_lines=[13]}
check: function(checkPredicate, unused) {
    if ((checkPredicate) && (adblockDetected == 0)) {
        // Adblocker detected, arm
    } else {
        var q = 'ins.adsbygoogle',
            adsbygoogleQuery = document.querySelector(q);

        if ((adsbygoogleQuery) && (adblockDetected == 0)) {
            if (aDefOne == 'yes') {
                // Special defense one: AdSense defense (see above)
            };
        } else {
            if (adblockDetected == 0) {
                if (aDefTwo == 'yes') {
                    // Special defense two: Special element defense
                }
            }
        }
    }
```
{{</details-code-block>}}

So why the disclaimer? This method tries to include the AdSense script. If it doens't load, it's likely the adblocker blocked the network request, so BlockAdBlock triggers.
But this may mess up some web sites, hence the warning. 

{{<details-code-block 
summary="If we fail to load AdSense, trigger the overlay."
aside="`onerror` fires upon a failure on at network level, like an adblocker blocking the request."
open=true
>}}
``` js {hl_lines=[10,11,12]}
if (aDefTwo == 'yes') {
    /* Add Google ad code to head.
        If it errors, the adblocker must have blocked the connection. */
    var googleAdCode = '//static.doubleclick.net/instream/ad_status.js';
    consolelog('case3: standard bait says ads are NOT blocked. Maybe ???\
      No Adsense is found. Attempting to add Google ad code to head...');
    var script = document.createElement('script');
    script.setAttribute('type', 'text/javascript');
    script.setAttribute('src', googleAdCode);
    script.onerror = function() {
        window['' + randomID + ''].arm()
    };
    adblockDetected = 1;
    if (!scriptExists(googleAdCode)) {
        document.getElementsByTagName('head')[0].appendChild(script)
    };
    adsbygoogleQuery = 0;
    window['' + randomID + ''].check = function() {
        return
    }
}
```
{{</details-code-block>}}

And indeed, most adblockers fall for it and block the request.
However, there's one adblocker that I haven't mentionned until this point. Let's talk about the [Brave browser](https://brave.com/fr/).

### Brave Browser's answer to BlockAdBlock

Until now I've examined uBlock Origin's response against BlockAdBlock. And it works, but it needs a specific filter to be added for each site that has BlockAdBlock on it.
Brave is impressive because it detects and circumvents BlockAdBlock directly on all versions, without any action needed.
Although we can't learn how without a lot of effort, as Brave is closed source, we can examine how it counters the above defense if we look in DevTools.

Instead of blocking the `ad_status.js` request, it lets it through but loads a **0-byte fake Google Ads instead**. This clever trick fools BlockAdBlock, because `onerror` fires only if the network request fails.

{{<img 
src="chromium-brave" 
alt="Chromium with adblocker & Brave vs BlockAdBlock: network requests">}}

## Version 5 (March 2016 - November 2016)

{{<re-bab/github>}}
[Source code](https://github.com/xy2iii/BlockAdBlock-reversed/blob/master/v5-reversed.js)[v4/v5 diff](https://github.com/xy2iii/bab-history/commit/b20d45201125767d63f5718b44a47082847e49bf#diff-f9901228d7dadbc695e79f98b44125e6)
{{</re-bab/github>}}

### Advanced defense: Favicon spam

The only change of note in this version is that the second advanced defense was rewritten, but still holds the same basic principle: try network requests that will be blocked by the adblocker. This time, however, it tries to load favicons instead of AdSense.

Brave evades this detection in the same was as above. It loads the images correctly, but creates fake 1x1 images.

{{<details-code-block 
summary="Favicon spam. `baitImages` generates bait images, too."
aside="`baitImages` may be called so frequently, with a different, random amount of images, to throw off adblockers who want to block statically."
open=true
>}}
``` js {hl_lines=[15,20]}
if (aDefTwo == 'yes') {
    if (! window['' + randomID + ''].ranAlready) {/
        var favicons = [
            "//www.google.com/adsense/start/images/favicon.ico",
            "//www.gstatic.com/adx/doubleclick.ico",
            "//advertising.yahoo.com/favicon.ico",
            "//ads.twitter.com/favicon.ico",
            "//www.doubleclickbygoogle.com/favicon.ico"
            ],
            len = favicons.length,
            img = favicons[Math.floor(Math.random() * len)],
        ...
        baitImages(Math.floor(Math.random() * 2) + 1); // creates bait images
        var m = new Image();
        m.onerror = function() {
            baitImages(Math.floor(Math.random() * 2) + 1);
            c.src = imgCopy;
            baitImages(Math.floor(Math.random() * 2) + 1)
        };
        c.onerror = function() {
            adblockDetected = 1;
            baitImages(Math.floor(Math.random() * 3) + 1);
            window['' + randomID + ''].arm()
        };
        m.src = img;
        baitImages(Math.floor(Math.random() * 3) + 1);
        window['' + randomID + ''].ranAlready = true
    };
}
```
{{</details-code-block>}}

## Version 6 (April 2016 - November 2016): blocking Brave

{{<re-bab/github>}}
[Source code](https://github.com/xy2iii/BlockAdBlock-reversed/blob/master/v6-reversed.js)[v5/v6 diff](https://github.com/xy2iii/bab-history/commit/6ab4ad4272cfcd131013702e144476abf2d5101e#diff-f9901228d7dadbc695e79f98b44125e6)
{{</re-bab/github>}}

So far BlockAdBlock's techniques, although simplistic at first, have grown in terms of complexity and detection rate. 
But there's still one enemy left unconquered: the Brave browser.

### Advanced defense: Fake favicon detection

Why did BlockAdBlock switch from trying to load a script to an image (a favicon)? 
The answer is this code, which is put inside the "favicon spam" defense and activates if the Brave defense is active.

{{<details-code-block 
summary="Detecting Brave Browser: check the response for a fake image."
aside="Check the favicon's size. If it's less than 8x8, it was probably swapped out by Brave."
open=true
>}}
``` js {hl_lines=[7]}
if (aDefTwo == 'yes') {
    baitImages(Math.floor(Math.random() * 3) + 1);
    // earlier favicon code...
    var m = new Image();
    if ((aDefThree % 3) == 0) {
        m.onload = function() {
            if ((m.width < 8) && (m.width > 0)) {
                window['' + randomID + ''].arm()
            }
        }
    };
}
```
{{</details-code-block>}}

With this method, Brave is defeated, and other adblockers will be detected if they run the code (most, like uBlock Origin, outright block it in the first place.)

After this update, around the end of November 2016, BlockAdBlock disappeared from the web. Although their "advanced defense" techniques work, they were never enabled for the majority of users. This was their last update, and their last post on both Twitter and their site was sometimes in late 2017

However, the legacy BlockAdBlock left is significant. And even though it can be trivially blocked nowadays, I still see BlockAdBlock used in today's sites.

## Conclusion
In the end, who will win the arms race between ad-blockers and ad-blockers-blockers? Only time can tell, but I think ad-blockers still have the advantage. As the arms race evolves, ad-blockers will have to use more and more contrived techniques and completely custom code, as watching BlockAdBlock's evolution over time hopefully shows. 

On the other hand, blockers have the advantage of stable systems and powerful filtering tools via filter lists, and have access to JavaScript, too: with these systems, it only takes one person to figure out how to defeat the adblocker and update the filter list with new sites.

By analysing BlockAdBlock's evolution over time, as well as various ad blocker's responses, we managed to draw a picture of the small war between BlockAdBlock and ad blockers, and in the process learnt how ad-blockers-blockers block the ad-blockers.

[You can find my reverse-engineering on GitHub](https://github.com/xy2iii/BlockAdBlock-reversed). Thank you for reading.

[^unpacker]: If you want an intuition of how it works, try pasting the below example into a JS console and then look at the code. If you're interested in its inner workings, [here's the source code](https://github.com/evanw/packer/blob/master/packer.js). 

[^eval->log]: Don't believe me? Try changing `eval` to `console.log` in the first line of the above example and you might find something hidden...

[^script-dates]: 
    The timestamp says `201510`, so shouldn't it be October? The reason for this is that we don't know when the script changed. All we know is:

    * On 2015-10, there was one version saved: `20151007203811.js`.
    * On 2015-11, there was a new version: `20151113115955.js`.

    As far as we know, the script could have been changed the day before the second timestamp. As such, I err on the cautious side when timing the versions.

[^v1-bug-test]:
    The tests for v1, above, were made while fixing this bug in the v1 script.

[^reddit-correction]:
    Thanks to [McStroyer on Reddit](https://www.reddit.com/r/javascript/comments/fs9030/how_an_anti_adblocker_works_reverseengineering/fm18g9m?utm_source=share&utm_medium=web2x) for correcting me about this.

<script src="/js/lib/d3.v5.min.js"></script>
<script src="d3-map.js"></script>