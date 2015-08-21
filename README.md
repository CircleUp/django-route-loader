# django-route-loader

Webpack loader plugin to hook into [Django named routes](https://docs.djangoproject.com/en/1.8/topics/http/urls/#reversing-namespaced-urls).

## Usage

Install the plugin, no Webpack configuration is necessary.

```sh
npm install --save django-route-loader
```

Define the Django route.

```python
from django.conf.urls import include, url

urlpatterns = [
    url(r'^user/(?P<user_id>\d+)/$', user.views.user_prifile, name='user_profile'),
]
```

Require the route through the plugin.

```javascript
var userProfileRoute = require('djang-route!?user_profile');

assert.equal(userProfileRoute({user_id: 1337}), 'user/1337/');
```
