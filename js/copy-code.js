// Mostly stolen from https://www.dannyguo.com/blog/how-to-add-copy-to-clipboard-buttons-to-code-blocks-in-hugo/.
function addCopyButtons(clipboard) {
    // Only select the actual code blocks,
    // not line numbers (which are also wrapped in <code>s.)
    const codeElements = document.querySelectorAll('.highlight code')
    const containers = document.querySelectorAll('.highlight')
    // To do so, check if it has a class.
    // Real code has a class like "language-js" or "language-plaintext".
    Array.from(codeElements)
    .filter(e => e.classList.length != 0) 
    .forEach((codeBlock, i) => {
        const button = document.createElement('button');
        button.className = 'copy-code-button';
        button.type = 'button';
        button.innerHTML = '<i data-feather="clipboard"></i><span></span>';
        const span = button.querySelector('span');

        const initialText = '<b>Copy</b>';
        const copyText = '<b>Copied!</b>';
        const errorText = '<b>*** Error</b>';

        span.innerHTML = initialText

        button.addEventListener('click', function () {
            clipboard.writeText(codeBlock.innerText).then(function () {
                /* Chrome doesn't seem to blur automatically,
                    leaving the button in a focused state. */
                button.blur();

                span.innerHTML = copyText;

                setTimeout(function () {
                    span.innerHTML = initialText;
                }, 2000);
            }, function (_) {
                span.innerHTML = errorText;
            });
        });

        const container = containers[i]
        container.prepend(button)
    });
}
addCopyButtons(navigator.clipboard);