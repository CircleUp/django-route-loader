from __future__ import unicode_literals

import os
import sys
import json
from contextlib import contextmanager
from django.core.urlresolvers import get_resolver


@contextmanager
def suppress_stdout():
    with open(os.devnull, "w") as devnull:
        old_stdout = sys.stdout
        sys.stdout = devnull
        try:
            yield
        finally:
            sys.stdout = old_stdout


def ipc(code):
    with suppress_stdout():
        output = json.dumps(eval(code))
    print output


def reverse_route(viewname):
    possibilities = [
        dict(possibility=possibility, pattern=pattern, defaults=defaults)
        for possibility, pattern, defaults in get_resolver(None).reverse_dict.getlist(viewname)
    ]

    # such wow!  pull a list of files to watch for changes
    python_dependency_list = [m.__file__ for m in sys.modules.values() if hasattr(m, 'urlpatterns')]

    return dict(
        possibilities=possibilities,
        python_dependency_list=python_dependency_list
    )
