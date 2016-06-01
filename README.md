# Infoblox WAPI quickstart Guide

This is a quickstart guide to using the infoblox WAPI. It is not intended
to be a complete set of API docs, those are [available
here](https://support.infoblox.com/app/utils/login_form/redirect/docs)
and really are worth the read. This is just a set of quick pointers to get you
up to speed

## I tried to read the docs and they don't make any sense

> If you see something, say something

There are probably issues with the documentation (otherwise this page wouldn't exist), but unless you open a bug report it will never get fixed. If you're trying to use the docs and can't find what you need, then get a bug report back with the following info:
* I wanted to do XXX
* I was expecting to find YYY in the docs
* Instead i found ZZZ

## WAPI, PAPI, RESTful, what's the difference?

NIOS has 2 APIs. There is the legacy perl based API, also known as the
PAPI (for Perl API), and there is the newer RESTful API, known as the
WAPI (for Web API). We're dealing with the WAPI in this document.

## Instant gratification

Open a web browser to the GUI of your NIOS Grid master, make note of the
name (or IP address)

Now, in the browser, type in the following url:

    https://((my.gridmaster.name))/wapi/v1.2/grid

You should get prompted to ask for your username and password (again)
and then get output that looks something like this:

    <?xml version="1.0"?>
    <list>
        <value type="object">
            <_ref>grid/b25lLmNsdXN0ZXIkMA:mygm</_ref>
        </value>
    </list>

## XML or JSON

Ok, so you got back a pile of XML gumpf, that's fine if you like XML,
but there are a lot of examples that seems to reference JSON output, how
do you get that?

Well the WAPI can return either XML or JSON output.  The default is XML,
and you have to ask for JSON specifically.  Lets change the that last url
so it now looks like this:

    https://((my.gridmaster.name))/wapi/v1.2/grid?_return_type=json-pretty

You should now get something that looks like this :

    [
        {
            "_ref": "grid/b25lLmNsdXN0ZXIkMA:mygm"
        }
    ]

But that's it, you're done, go take break, you now know the fundamentals
of making a query using the WAPI.

> Note: the WAPI will also return JSON by default if you send a content type
> in the request header:
>
>    *Content-Type: application/json*

## Authentication

You may have noticed that when you did that second request, you weren't
asked to authenticate (unless you killed you browser or did something equally
drastic). The WAPI uses
[basic authentication](https://en.wikipedia.org/wiki/Basic_access_authentication) for all requests, and
once you've entered your credentials, the server will set a cookie that
the browser can re-use for all following requests.

This is fine for ~60% of the time, but that login prompt can get annoying
at times, so there are two other ways to authenticate a user, which are all
part of the 'Basic' authentication spec.

You can pass the username and password in the URL:

    https://username::password@((my.gridmaster.name))/wapi/v1.2/...

This is NOT recommended unless you don't care strongly about your
security.

Or, you can pass the authentication in a header :

    Authorization : "Basic ((myauthkey))"

The Authorisation key is a base64 encoding of the string
'username:password' (note that the  ':' is part of the string)

lastly, if you have a client that can manage cookies, you can send the **IBAPAUTH**
cookie in lieu of any authentication data.

## Nomenclature

To keep things simpler for all future examples, we will ignore the what
authentication method you are going to use and simply refer to URLs by
their absolute path. E.g:

    /wapi/v1.2/grid

## Versions

You should also take note of how version strings work. The version string
is a developer tool, and not (strictly speaking) a server requirement.

A current WAPI version is backward compatible with WAPI releases that have
the same WAPI version or with all earlier versions.  Though the protocol
itself may not be strictly backward compatible, the server emulates the
correct behaviour, when necessary.

For example, a client that uses WAPI version 1.2 behaves the same way
even if it talks to a server that supports version 1.5.

Newer versions of the WAPI will have new features, so when you specify
the version in the url you are saying

    "I expect to make calls that use the features defined in this version of the API"

If the server doesn't support the version you are asking for you will get
an error:

    Version 2.4 not supported

Thus, you do not have to bump the version number in the URL if you
upgrade your grid.

## GET/POST/PUT etc

For the initial demo we used a simple HTTP GET method.  This is what you
use to read data from NIOS, but we're using a RESTful API here, so there
are additional HTTP methods that you should be reminded about.  They are:

* GET to get or search for objects
* POST to add a new object
* PUT to modify an object (It must already exist in the database)
* DELETE to remove an object

We will go into detail on these methods later in the guide

## Objects

What are 'objects'? An 'object' is just a 'thing' in the database. It
could be a network, a DNS record, or properties of a grid member, and there
are different object types, and there are a lot of them

You could think of it as a row in a relational database, and each
object type is a different table or index.  But NIOS uses an Object
Oriented database, so there aren't any rows.  They are more like nodes in
a very large hierarchy.  

So to keep things sane for everyone they are referred to simply as
**objects**, (and types).

When you want to work on something in the database you specify the
object type with the url and any parameters are either sent in the query
string or in the body of the message. E.g:

    /wapi/v1.2/grid
    /wapi/v1.2/network
    /wapi/v1.2/record:host
    /wapi/v1.2/record:host?name=infoblox.localdomain

Now, to keep you entertained, type in the following url :

    /wapi/v2.0/member?_return_type=json-pretty

## Query String parameters

These are **REALLY IMPORTANT**. Seriously. If you're using a WAPI call that
doesn't have query string params you're doing it wrong.

Go ahead and type in the following url

    /wapi/v1.2/record:host

Now go grab some tea or coffee or lunch because this could take a while.

What you've just done is asked for ALL THE HOST RECORDS in the database.
After some period of time you will either get a very long list of data or
an error message that looks a lot like this:

    {
        "Error": "AdmConProtoError: Result set too large (> 1000)",
        "code": "Client.Ibap.Proto",
        "text": "Result set too large (> 1000)"
    }

> **NEVER EVER DO THAT AGAIN**

The WAPI (and all the NIOS apis) are NOT designed for bulk data export,
they are designed for automation, they work a lot better and faster when
you do specific atomic actions on a specific object.

You control all this with the query string params, they are a set of
controls that affect your operations and are not (mostly) specific to the
object type. Its a tad confusing (and inconsistent) but here are some
examples:

    # return JSON format
    /wapi/v1.2/grid?_return_type=json-pretty

    # get a specific host record
    /wapi/v1.2/record:host?name=infoblox.localdomain

    # get a specific network
    /wapi/v1.2/record:host?network=127.0.0.1/24

    # get a specific all host records matching a search string
    /wapi/v1.2/record:host?name~=infoblox

    # return some additional fields on the object
    /wapi/v1.2/record:host?_return_field+=comment&name~=infoblox

    # return more than 1000 results (be prepared to wait)
    /wapi/v1.2/record:host?_max_results=2000&name~=lab

Type in the following url to your browser window

    /wapi/v2.3/member?_return_type=json-pretty&_return_fields%2B=comment,extattrs&platform=INFOBLOX

*(Query strings must be URL encoded if you are typing things into a browser, so the '%2B' is just an encoding of the '+' character, YMMV.)*

### The different types of query strings

Essentially there are 3 kinds of query string variables:

* Query string 'arguments'

Are used to specify general options or method
specific options and data for the request. All options start with the
character '_' (underscore) :

    /wapi/v1.2/record:host?_return_fields+=comment&name~=infoblox

* Query string 'functions'

Are associated with particular objects, only work with POST methods
and usually return calculated values :

    /network/ZG5zLm5ldHdvcmskMTA==?_function=next_available_ip&num=3

* Query string 'parameters'

Are almost always modifiers on a query to narrow the search:

    /wapi/v1.2/record:host?name=infoblox

## Error handling

So at this point we need to digress into errors and how to clean things up a bit

All GET requests (searches) will return an ARRAY of objects, even if there is
an exact match. So you will always get something that look like this:

    [
        {
            "_ref": "network/ZG5zLm5ldHdvcmskMTAuMS4wLjAvMTYvMA:10.1.0.0%2F16",
            "network": "10.1.0.0/16",
        }
    ]

If you search didn't match any results you will NOT get an error, you will
just get an empty array:

    [ ]

If you ever get an error you will get back an HTTP error code, and RECORD
instead of an ARRAY:

    {
      "Error": "AdmConProtoError: Unknown argument/field: netwdork",
      "code": "Client.Ibap.Proto",
      "text": "Unknown argument/field: netwdork",
      "trace": "  File "/infoblox/common/lib/python/info..."
    }

And if you had a low level HTTP error, you won't even get JSON (even if you
asked for it) you may get a server level error message or an XML dump

    <!DOCTYPE HTML PUBLIC "-//IETF//DTD HTML 2.0//EN">
    <html><head>
    <title>404 Not Found</title>
    </head><body>
    <h1>Not Found</h1>
    <p>The requested URL /pwapii/v1.2/record:host was not found on this server.</p>
    </body></html>

But, When the server returns an error with status code \>= 400, the body is
always in JSON format, irrespective of any Accept or \_return\_types.

> In case you haven't guessed by now, this can get frustrating after a while.

### Cleaning up the output format

Lets do that last query again, but this time we will add a '_return_as_object=1'

    /wapi/v2.1/member?_return_as_object=1&_return_type=json-pretty&_return_fields%2B=extattrs

What you get back should look a bit like this:

    {
      "result":
          [ ...

And we have standardised the format to always be a json record, with the results in an array in the 'result' field. This feature was introduced in WAPI v2.1, But it is a good habit to always use this extra query param.

### Error handling logic

All your error and return messaging handlers are going to have to have to
have some smarter logic in them. Your best a approach is to test for the
following :

* set _return_as_object=1

* Check the HTML error code is !=200

* Check if the return text is XML, HTML or JSON

* If the type is JSON, Check if the data is a STRING "", RECORD {}

* If the data is an RECORD, Check if there is an 'Error' field

* If the data is an RECORD, Check if there is an 'result' field

* If there is a result, Check if the length is > 0

* If the data is an STRING, it is a \_ref from a successful PUT or POST

To make things slightly sane, if the error message is in JSON format, The
returned message conforms to JSON, but is formatted to ensure that the
first line of the body always contains the text “Error,” an error type,
and an error message.

It is worth reading the API docs section on 'Error Handling' to get a full
understanding of this.

## Searching and modifiers

So, we've now got a handle on some of the query string params, we can working on searching in more detail.

When you are doing searches you need to add query strings to make your
search as specific as possible. Every object only supports a subset of
searchable fields.

For example, the query :

    /wapi/v1.2/network?network=192.168.0.0/24

Will only return networks that have an EXACT match for the network
'192.168.0.0/24'

If you want to search using a wildcard or regex you need to add a '~'
modifier to the field so the query looks like this:

    /wapi/v1.2/network?network~=192.168

Note that the '~' modifier comes BEFORE the '=' sign. If you do a lot of
RESTful development you will notice that you are creating a whole new
field here ('network~' instead of 'network').  This can get problematic if
you are using certain frameworks, but there are good reasons for it that
we won't go into here. you just have to suck it up and get clever with your
client code.

A search argument can use the following modifiers, and they can be
combined in any order (E.g : 'name:~')

    ! Negates the condition.
    : Makes string matching case insensitive.
    ~ Regular expression search. Expressions are unanchored.
    < Less than or equal.
    > Greater than or equal.

## So how do I know what fields are on each object ?

You will need to read into the API docs to learn what
these are. There is a table at the **END** of every object definition showing
what fields are Read Only (R/O) and what fields are searchable.

> Yes, the table is at the **END** of the object description

> You have to **SCROLL DOWN** to find it

Or, just use the table of contents to go to the __next__ object and then __scroll up__

## Extensible Attributes

Extensible attributes have a slightly funkier syntax because the name of the EA
is variable and it could collide with existing field names. As such any EA is
prefixed with the '\*' character.

So to search for all networks where the EA 'Site' is set to 'Nevada' we
would do the following:

    /wapi/v1.2/network?*Site=Nevada

Or even this

    /wapi/v1.2/network?*Site=Nevada&*Role=DMZ

## UIDs and refs

By now you know about how to perform reads to the database, what about
updates?

To modify an object we need to know it's unique id, this is
always returned with every object and is in the **\_ref** field :

    [
        {
            "_ref": "network/ZG5zLm5ldHdvcmskMTAuMS4wLjAvMTYvMA:10.1.0.0%2F16",
            "network": "10.1.0.0/16",
            "network_view": "default"
        },
        {
            "_ref": "network/ZG5zLm5ldHdvcmskMTAuMi4wLjAvMTYvMA:10.2.0.0%2F16",
            "network": "10.2.0.0/16",
            "network_view": "default"
        }
    ]

The \_ref is a relative url so in the above example you could get the object
directly with the url:

        /wapi/v1.2/network/ZG5zLm5ldHdvcmskMTAuMi4wLjAvMTYvMA:10.2.0.0%2F16

Also, everything after the ':' in the \_ref is optional and just there for human
readability, the following url would also work:

        /wapi/v1.2/network/ZG5zLm5ldHdvcmskMTAuMi4wLjAvMTYvMA

But, don't try this at home, every \_ref is unique to both the grid and the
object (it's essentially a random string). You can't share \_refs between grids
and the \_ref may change over time (So don't try and cache it offline).

Thus if you want to modify an object, you must first get its \_ref

> **Never make a PUT without first doing a GET**

This is just good database practice.

## Modifying an object

To edit an object, send a PUT request to the url of the \_ref.

You cannot send a PUT using a standard browser, you going to need a client that
lets you control and send other HTTP methods. E.g:

    curl -k1 -u admin:testpw -X POST https://192.168.1.2/wapi/v2.3/network

Whatever client you use is up to you, this guide will just tell you the TYPE of
method to use and how to format the payloads

All the values you want to change must be in the BODY of the message and
NOT in the query string.  So you could do the following

    PUT /wapi/v1.2/network/ZG5zLm5ldHdvcmskMTAuMi4wLjAvMTYvMA

But the WAPI is kinda stupid about determining the format of the the
payload, so it is safer to be specific by sending an additional header and
sending everything as JSON:

    Content-Type: application/json

Now you can update the object With a body of

    {
        comment : 'my modded network'
    }

And the object would now have a new comment on it. If it worked the server will
return the \_ref to the modified object. This will be a (JSON) string, instead
of some sort of record (there won't be any '{}' in the return message)

    "network/ZG5zLm5ldHdvcmskMTAuMi4wLjAvMTYvMA:10.2.0.0%2F16",

You can then check your work with an additional query

    /wapi/v1.2/network/ZG5zLm5ldHdvcmskM..==?_return_fields%2B=comment

The \_ref may also have changed, DO NOT ASSUME that you can re-use the original
\_ref, always use the one returned by the most recent request.

## How can modify or add an ip address?

> You can't, you won't, don't

The unfortunate part to this problem is that you need to learn a bit about how NIOS works and how to admin the system, but the short answer is:

> Address are **read only** synthetic objects.

They only exist because some other object (E.g a HOST or a FIXED ADDRESS) has an IP address.

Addresses, PTR records, etc are usually auto generated from the data in some other object. Thus you create the other object, not the address directly.

## Adding an object

To add an object you don't need the \_ref (obviously), you just need to send a
POST to the correct object type:

    POST /wapi/v1.2/network
    # Don't forget the Header(s)...
    Content-Type: application/json
    Authorization: Basic fghwrth23aw4==

With a body containing the required fields:

    {
        network: "192.168.99.0/24",
        comment: "My test network"
    }

If it worked, the server returns a \_ref to the new object:

    "network/DFGSdEdVTgdsdTTJMTAuMi4wLjAvMTYvMA:192.168.99.0%2F24",

## Deleting an object

To delete an object, just send a DELETE request to the \_ref url :

    DELETE /wapi/v1.2/network/ZG5zLm5ldHdvcmskMTAuMi4wLjAvMTYvMA

And the server will return the same \_ref (which is now useless since the
object no longer exists)

## A decidedly complex example

Lastly, Since this gets asked from time to time, it is possible to do some fairly complex things with the WAPI, and a lot of that is really not in the scope of a 'quickstart' guide. (It is worth readinf up on the 'request' and 'fileop' objects). However this is how you would

* add a host record
* with Extensible attributes
* with multiple addresses
* using the next_available_ip function
* selecting a network based on some extensible attributes


POST to the correct object type:

    POST /wapi/v1.2/record:host
    # Don't forget the Header(s)...
    Content-Type: application/json
    Authorization: Basic fghwrth23aw4==

With a body containing the required fields:

    {
        "name": "host37",
        "view":"default",
        "ipv4addrs": [
            {
                "mac":"aabbccddeefc",
                "configure_for_dhcp":false,
                "ipv4addr": {
                    "_result_field": "ips"
                    "_object_function": "next_available_ip",
                    "_object": "network",
                    "_object_parameters": {
                        "*Agency:": "TXDOT",
                        "*Site:": "ADC",
                        "*Zone:": "Non-DMZ",
                        "network_view": "default"
                    },
                }
            },
            {
                "mac":"aabbccddeefd",
                "configure_for_dhcp":false,
                "ipv4addr": {
                    "_result_field": "ips"
                    "_object_function": "next_available_ip",
                    "_object": "network",
                    "_object_parameters": {
                        "*Agency:": "TXDOT",
                        "*Site:": "ADC",
                        "*Zone:": "Non-DMZ",
                        "network_view": "default"
                    },
                }
            }
        ],
        "extattrs": {
            "Work Order": { "value": "REQ98765" },
            "Tenant ID": { "value": "Customer 1" },
            "CMP Type": { "value": "MuleSoft" },
            "VM ID": { "value": "123456" },
            "VM Name": { "value": "my vm name" },
            "Cloud API Owned": { "value": "True" }
        }
    }
