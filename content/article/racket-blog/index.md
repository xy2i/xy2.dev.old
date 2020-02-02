+++
title = "Writing using racket and X-expressions"
date = 2019-11-18T11:40:29+01:00
categories = ["Software Engineering"]
tags = []
draft = false

summary = "How I wrote a blog, using ideas from the 70s, in today's world."

aliases = [
    "/racket-blog.html"
]
+++
What if I wanted to make HTML programmable - treat it as data, and add my own constructs and syntax to it? Let's make something that would generate a list for any value I pass it. Let's write it in Python.

```python
def genlist(item, n):
	html = '<ul>'
	for i in range(1, n):
		html += '<li>%s</li>' % item
	html += '</ul>'
	return html
```
The cool thing is that `genlist` can take itself as an argument: `genlist(genlist('item', 3), 5)` will return a nested list of HTML elements. We've augemented HTML with new "syntax".

But this approach is a little limited. We end up manipulating strings around, instead of a proper data representation for HTML. Instead of having a tree structure, we have a stream that can be only added to. There's also a lot of busywork, like opening and closing tags that could be done away with. Let's try again with [templates](https://jinjda.palletsprojects.com/en/2.10.x/templates/):

```python
<ul>
{% for i in range(1, n) %} 
	<li>{{ item }}</li>
{% endfor %}
</ul>
```

With templates, we're writing HTML directly. At any moment we can drop down to Python to generate HTML. Unfortunately, by using this new templating language, we need to keep track of both Python and the templating engine.

We've lost a lot of expressiveness: what if we wanted to create a nested list again? We could make it a [template macro](https://jinja.palletsprojects.com/en/2.10.x/templates/#macros), but we have to do extra work to call it inside itself, and suddently we have an extra language to learn.

That leaves us with a choice:

+ use our favorite programming language to generate HTML, allowing to be more dynamic. 
+ use templates at a loss of expressiveness. 

What if we could have both? 

## Racket X-expressions: a data structure for HTML

[Racket](https://racket-lang.org/) has support for [X-expressions](https://docs.racket-lang.org/xml/index.html#%28def._%28%28lib._xml%2Fprivate%2Fxexpr-core..rkt%29._xexpr~3f%29%29). Our nested list from before: `genlist(genlist('item', 3), 5)` would look like this in an X-expression:

```lisp
(list 'ul
	(list 'li (list 'ul (list 'li "item") (list 'li "item")))
	(list 'li (list 'ul (list 'li "item") (list 'li "item")))
	(list 'li (list 'ul (list 'li "item") (list 'li "item")))
	(list 'li (list 'ul (list 'li "item") (list 'li "item"))))
```

The elements with a quote `'` before them are [symbols](https://docs.racket-lang.org/reference/symbols.html), so `'li` represents an list element.
`(list 'li "item")` becomes an li element containing `"item"`. Elements can contain other elements too: `(list 'li (list 'p "item"))` contains an li that contains a p, and so on. We can convert this X-expression into HTML with [`(xexpr->string)`](https://docs.racket-lang.org/xml/index.html#%28def._%28%28lib._xml%2Fmain..rkt%29._xexpr-~3estring%29%29), giving us a way to go back to HTML.

This form is a little unwieldy, with `list` everywhere. Racket offers a construct, named [`quote`](https://docs.racket-lang.org/guide/quote.html) and written `'` that can make writing these expressions easier:

```racket
'(ul
	(li (ul (li "item") (li "item")))
	(li (ul (li "item") (li "item")))
	(li (ul (li "item") (li "item")))
	(li (ul (li "item") (li "item"))))
```

`quote` takes any thing that looks like a list - anything with parantheses, creates a list and __quotes__ each value. putting a `'` before each of them. If the thing to be quoted is a value, it leaves it as is. Quoting is recursive: if it finds a list, it will quote each element of the list.

With this form `'(li "item")` becomes `(list 'li '"item")`. On nested lists, `'(li (p "item"))` becomes `(list 'li (list 'p "item"))`.

Sometimes we may want to quote something, but keep some expressions from being quoted. We can use the [`quasiquote`](https://docs.racket-lang.org/guide/qq.html) form, written ``` ` ``` (backtick). Within the quasiquoted list, we can use `,` to declare our non-quoted expressions.

For example, take [`(string-append)`](https://docs.racket-lang.org/reference/strings.html#%28def._%28%28quote._~23~25kernel%29._string-append%29%29), which puts two strings together. If we want a list with a call to `(string-append)` in it, we run into issues quickly:

`'(li (p "hello") (string-append "hi" "world"))` evaluates to `(list ('p "hello") ('string-append "hi" "world"))`. With quasiquoting, we can tell `quote` that `(string-append)` is a function call:

The list ``` `(li (p "hello") ,(string-append "hi" "world")) ``` evaluates to `(list ('li ('p "hello") "hiworld"))`.

We could have something that generates a list, like a variable with a list of several values, or a function that returns a list of values. To get its elements instead of the list directly, we can use `unquote-splicing`, written `,@`, to _flatten_ the list:

```lisp
(define (things '((li 1) (li 2) (li 3))))

`(ul ,things)
-> '(ul ((li 1) (li 2) (li 3)))
`(ul ,@things)
-> '(ul (li 1) (li 2) (li 3))
```

## Code as data: adding syntax to HTML

We have a data structure that represents HTML - and we can define `genlist` again:

```lisp
(define (recur-li item n)
	(if (= n 0) '() ; empty list    
		(cons
			`(li ,item) ; unquote the item, if it is another function
				; eg. (genlist) passed to this function
			(recur-li item (- n 1)))))
			 
(define (genlist item n)
	`(ul ,@(recur-li item n))) ; get each element from the 
		; recur-li list in the ul instead of
		; having a list of li inside the ul
```

The bulk of the work is done by `recur-li`, a recursive function that constructs a list of `(li)`. `(genlist "hi" 5)` will build `'(ul ((li "hi") (li "hi") (li "hi") (li "hi") (li "hi")))`. 

Finally, we get back the power we had with the naive Python implementation. We can use `genlist` within itself: `(genlist (genlist "item" 3) 5)` will create a list, where each element is a `(genlist)` call which is then interpreted. We've also kept a nice structure around, where we deal with a representation of HTML in our code.

Let's make a page with this in mind:

```lisp
(define our-page
	`(html
		(body (p "Hi world!")
			,(genlist (genlist "hello!" 3) 5))))
```

This generates:

```lisp
-> 
'(html
	(body
	 (p "Hi world!")
	 (ul
		(li (ul (li "hello!") (li "hello!") (li "hello!")))
		(li (ul (li "hello!") (li "hello!") (li "hello!")))
		(li (ul (li "hello!") (li "hello!") (li "hello!")))
		(li (ul (li "hello!") (li "hello!") (li "hello!")))
		(li (ul (li "hello!") (li "hello!") (li "hello!"))))))
```

We can use `(xexpr->string our-page)` to convert it to a string. It's neat, but it doens't have an `head` element. It would also be nice to set the title of the page to something. Surely we can pass the title to `our-page`?

```lisp
(define (gen-head title)
	`(head (meta ((charset "utf-8")))
		   (title ,title)))

(define (our-page title) ; our-page becomes a function
	`(html
		,(gen-head title)
		(body (p "Hi world!")
					,(genlist (genlist "hello!" 3) 5))))
```

And, as expected:

```lisp
(our-page "Saying hi")
->
'(html
	(head (meta ((charset "utf-8"))) (title "Saying hi"))
	(body
	 (p "Hi world!")
	 (ul
		(li (ul (li "hello!") (li "hello!") (li "hello!")))
		(li (ul (li "hello!") (li "hello!") (li "hello!")))
		(li (ul (li "hello!") (li "hello!") (li "hello!")))
		(li (ul (li "hello!") (li "hello!") (li "hello!")))
		(li (ul (li "hello!") (li "hello!") (li "hello!"))))))
```

It looks a lot like a template, where you pass data and that data goes somewhere within the template, and that's because it is one. With a little bit of ingeniuity and quoting, we've managed to make HTML programmable in a much more natural way.

There is no  distinction between code and data. Data can go anywhere code usually goes: as seen, we use the usual HTML elements like `body` along with our own constructs like `genlist` and it works. This is the principle behind [S-expressions](https://en.wikipedia.org/wiki/S-expression#Use_in_Lisp): __code is data__. With X-expressions, which are expressions as well, we can transform a fixed language like HTML and add our own constructs to it, instead of treating it as data to pass around.

Racket is particularly skilled at this feat: it can create its own languages. We could imagine a new language based on HTML but with new, more convenient syntaxic forms. If you are interested in this idea, check out [Beautiful Racket](https://beautifulracket.com/).

## Making a blog in Racket

This blog is written in Racket, and most of the HTML here is generated with X-expressions. The static site generator I use is called [polyglot](https://github.com/zyrolasting/polyglot), which allows to write HTML in any Racket-created language. It takes this idea and adds a lot of cool stuff to make it usable, including:

+ a [webpack-like system](https://github.com/zyrolasting/unlike-assets) in Racket to link assets together
+ writing in markdown, with the ability to drop down to a Racket script that generates HTML like shown here, to have full control over prose and markup
+ the ability to write HTML with any Racket language desired, not just Racket itself

If nothing else, making sites in Racket is fun. It's not tiring to use like many web frameworks, and I think the end result looks nice. Racket can be practical, too!
