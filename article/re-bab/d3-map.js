/* A closure stored in d3_map.
   Mostly to avoid polluting the namespace.
   Call with the version you need, eg. d3_map(0) for v1. */
const d3_map = (function() {
  const vis = d3.select(".d3-map");

  const data = [
    {
      versionName: "v1",
      time: "? - November 2015",
      href: "#version-1----november-2015-initial-script",
      features: [
        { name: "Architecture", href: "#architecture" },
        { name: "Bait ad creation", href: "#bab-bait-ad-creation" },
        { name: "Nag mode", href: "#nag-mode" },
        {
          name: "Blocking BlockAdBlock",
          href: "#blocking-blockadblock-version-1"
        }
      ]
    },
    {
      versionName: "v2",
      time: "November 2015 - January 2016",
      href: "#version-2-november-2015---january-2016-a-few-improvements",
      features: [
        { name: "Architecture", href: "#architecture" },
        {
          name: "Bait ad creation, less bugs",
          href: "#bait-ad-creation-less-bugs"
        },
        {
          name: "Detection via fake image ads",
          href: "#detection-via-fake-image-ads"
        },
        { name: "Nag mode", href: "#nag-mode" },
        {
          name: "Blocking BlockAdBlock",
          href: "#blocking-blockadblock-version-1"
        }
      ]
    },
    {
      versionName: "v3",
      time: "November 2015 - March 2016",
      href: "#version-3-november-2015---march-2016-generalized-baiting",
      features: [
        { name: "Architecture", href: "#architecture" },
        {
          name: "Bait ad creation, randomized IDs",
          href: "#bait-ad-creation-randomized-ids"
        },
        {
          name: "Detection via fake image ads",
          href: "#detection-via-fake-image-ads"
        },
        { name: "Nag mode", href: "#nag-mode" },
        {
          name: "Blocking BlockAdBlock, all versions",
          href: "#blocking-blockadblock-version-3-to-latest"
        }
      ]
    },
    {
      versionName: "v4",
      time: "January 2016 - April 2016",
      href: "#version-4-january-2016---april-2016-experimental-features",
      features: [
        { name: "Architecture", href: "#architecture" },
        {
          name: "Accidental debug comments",
          href: "#accidental-debug-comments"
        },
        {
          name: "Bait ad creation, randomized IDs",
          href: "#bait-ad-creation-randomized-ids"
        },
        {
          name: "Detection via fake image ads",
          href: "#detection-via-fake-image-ads"
        },
        {
          name: "Advanced defense: AdSense",
          href: "#advanced-defense-adsense"
        },
        {
          name: "Advanced defense: Special element defense",
          href: "#advanced-defense-special-element-defense"
        },
        { name: "Nag mode", href: "#nag-mode" },
        {
          name: "Blocking BlockAdBlock, all versions",
          href: "#blocking-blockadblock-version-3-to-latest"
        },
        {
          name: "Brave Browser's answer to BlockAdBlock",
          href: "#brave-browsers-answer-to-blockadblock"
        }
      ]
    },
    {
      versionName: "v5",
      time: "March 2016 - November 2016",
      href: "#version-5-march-2016---november-2016",
      features: [
        { name: "Architecture", href: "#architecture" },
        {
          name: "Bait ad creation, randomized IDs",
          href: "#bait-ad-creation-randomized-ids"
        },
        {
          name: "Detection via fake image ads",
          href: "#detection-via-fake-image-ads"
        },
        {
          name: "Advanced defense: AdSense",
          href: "#advanced-defense-adsense"
        },
        {
          name: "Advanced defense: Favicon spam",
          href: "#advanced-defense-favicon-spam"
        },
        { name: "Nag mode", href: "#nag-mode" },
        {
          name: "Blocking BlockAdBlock, all versions",
          href: "#blocking-blockadblock-version-3-to-latest"
        },
        {
          name: "Brave Browser's answer to BlockAdBlock",
          href: "#brave-browsers-answer-to-blockadblock"
        }
      ]
    },
    {
      versionName: "v6",
      time: "April 2016 - November 2016",
      href: "#version-6-april-2016---november-2016-blocking-brave",
      features: [
        { name: "Architecture", href: "#architecture" },
        {
          name: "Bait ad creation, randomized IDs",
          href: "#bait-ad-creation-randomized-ids"
        },
        {
          name: "Detection via fake image ads",
          href: "#detection-via-fake-image-ads"
        },
        {
          name: "Advanced defense: AdSense",
          href: "#advanced-defense-adsense"
        },
        {
          name: "Advanced defense: Favicon spam",
          href: "#advanced-defense-favicon-spam"
        },
        {
          name: "Advanced defense: Fake favicon detection",
          href: "#advanced-defense-fake-favicon-detection"
        },
        { name: "Nag mode", href: "#nag-mode" },
        {
          name: "Blocking BlockAdBlock, all versions",
          href: "#blocking-blockadblock-version-3-to-latest"
        }
      ]
    }
  ];

  const t = vis
    .transition("normal")
    .duration(200)
    .ease(d3.easeQuad);

  /* Create nav container. */
  function createNav() {
    vis
      .selectAll(".nav")
      .data([null])
      .enter()
      .append("div")
      .attr("class", "nav");
    return vis.selectAll(".nav");
  }

  /* Update previous button. */
  function prevButton(sel, i, dir) {
    sel
      .selectAll(".prev")
      .data([null])
      .enter()
      .append("button")
      .attr("class", "prev d3-btn")
      .text("<-- Previous");

    const buttonPrev = sel.selectAll(".prev");
    const atStart = i == 0;
    buttonPrev.data([atStart]).join(
      enter => enter,
      update =>
        update.style("opacity", atStart => {
          return atStart ? 0 : 1;
        }),
      exit => exit
    );

    buttonPrev.on("click", () => {
      d3_map(i - 1, "left");
    });
    if (atStart) {
      buttonPrev.on("click", null);
    }
  }

  /* Update title. */
  function title(sel, i, dir) {
    /* .title-container is a parent element, but that updates instantly, with the text.
       This element is needed in order to have a size in the document, when
       transitioning: otherwhise the container is empty and formatting is off. */
    sel
      .selectAll(".title-container")
      .data([null])
      .enter()
      .append("div")
      .attr("class", "title-container")
      .selectAll(".shadow")
      .data([null])
      .enter()
      .append("span")
      .attr("class", "shadow");
    const titleContainer = vis.selectAll(".title-container");

    const wait = titleContainer.transition("wait").delay(200);
    const waitDelay = titleContainer
      .transition("waitDelay")
      .delay(100)
      .duration(250)
      .ease(d3.easeExp);

    // Animated title
    titleContainer
      .selectAll(".title")
      .data(
        [data[i]],
        d => d.time // Array of one element
      )
      .join(
        enter => {
          enter.interrupt();
          enter
            .append("a")
            .attr("href", d => d.href)
            .style("opacity", 0)
            .attr("class", "title")
            .call(enter =>
              enter
                .transition(waitDelay)
                .style("opacity", 1)
                .text(d => `${d.versionName}: ${d.time}`)
            );
        },
        update => update,
        exit =>
          exit
            .text(d => d.time)
            .attr("href", d => d.href)
            .call(exit => {
              exit.interrupt();
              exit
                .transition(t)
                .style("opacity", 0)
                .style("color", "red")
                .style("transform", () => {
                  return dir == "left"
                    ? "translateX(8rem)"
                    : "translateX(-8rem)";
                })
                .remove();
            })
      );

    // Shadow
    titleContainer
      .select(".shadow")
      .transition(wait)
      .text(`${data[i].versionName}: ${data[i].time}`);
  }

  /* Update next button. */
  function nextButton(sel, i, dir) {
    sel
      .selectAll(".next")
      .data([null])
      .enter()
      .append("button")
      .attr("class", "next d3-btn")
      .text("Next -->");

    const buttonNext = sel.selectAll(".next");
    const atEnd = i == data.length - 1;
    buttonNext.data([atEnd]).join(
      enter => enter,
      update =>
        update.style("opacity", atEnd => {
          return atEnd ? 0 : 1;
        }),
      exit => exit
    );

    buttonNext.on("click", () => {
      d3_map(i + 1, "right");
    });
    if (atEnd) {
      buttonNext.on("click", null);
    }
  }

  /* Create ul if it doens't exit: https://github.com/d3/d3-selection/issues/91 */
  function createUl() {
    vis
      .selectAll("ul")
      .data([null])
      .enter()
      .append("ul")
      .attr("class", "list-container");
    return vis.selectAll("ul");
  }

  /* Update list elements. */
  function listElements(sel, i) {
    sel
      .selectAll("li")
      .data(data[i].features, d => d.name) // Key function: compare two objects.
      .join(
        enter =>
          enter
            .append("li")
            .attr("class", "list-item li-enter")
            .append("a")
            .style("opacity", 0)
            .attr("href", d => d.href)
            .text(d => d.name)
            .call(enter =>
              enter
                .transition(t)
                .style("color", "green")
                .style("opacity", 1)
            ),
        update =>
          update
            .attr("class", "list-item li-update")
            .select("a")
            .attr("href", d => d.href)
            .text(d => d.name)
            .style("color", "black"),
        exit =>
          exit
            .attr("class", "list-item li-exit")
            .call(exit =>
              exit // <a>
                .select("a")
                .attr("href", d => d.href)
                .text(d => d.name)
                .style("color", "red")
            )
            .transition(t) // <li>
            .style("opacity", 0)
            .remove()
      );
  }

  /* dir is "left" or "right", and indicates the clicked button.
   */
  return (i, dir) => {
    const nav = createNav();
    prevButton(nav, i, dir);
    title(nav, i, dir);
    nextButton(nav, i, dir);
    const ul = createUl();
    listElements(ul, i);
  };
})();
d3_map(0);
