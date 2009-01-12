#!/usr/bin/env python
#
# Copyright 2007 Google Inc.
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
#
import cgi
import datetime
import logging
import os
import wsgiref.handlers

from google.appengine.ext import db
from google.appengine.api import users
from google.appengine.ext import webapp


from google.appengine.ext.webapp.util import login_required
from google.appengine.ext.webapp import template
from google.appengine.ext.webapp.util import run_wsgi_app


# Uploader
# Downloader
# Save/Load

class User(db.Model):
  user = db.UserProperty(required=True)
  created = db.DateTimeProperty(auto_now_add=True)
  modified = db.DateTimeProperty(auto_now_add=True, auto_now=True)

  def _readers(self):
    for x in self.access_map:
      if x.can_read or x.can_share or x.can_delete or x.can_write:
        yield x.mindmap
  can_read = property(_readers)



class MindmapRevision(db.Model):
  title = db.StringProperty(required=True, default='Unnamed')
  author = db.ReferenceProperty(User, required=True)
  xmlmap = db.TextProperty(required=True)
  created = db.DateTimeProperty(auto_now_add=True)

class Mindmap(db.Model):
  title = db.StringProperty(required=True)  # Should mirror the latest revision title
  owner = db.ReferenceProperty(User, required=True)
  public = db.BooleanProperty(default=False)

  latest = db.ReferenceProperty(MindmapRevision)

  created = db.DateTimeProperty(auto_now_add=True)
  modified = db.DateTimeProperty(auto_now_add=True, auto_now=True)

  def _revisions(self):
    return (x.revision for x in self.revision_map)
  revisions = property(_revisions)

  def _readers(self):
    yield self.owner
    for x in self.access_map:
      if x.can_read or x.can_write or x.can_delete or x.can_share:
        yield x.user
  readers = property(_readers)

  def _writers(self):
    yield self.owner
    for x in self.access_map:
      if x.can_write or x.can_delete or x.can_share:
        yield x.user
  writers = property(_writers)

  def _deleters(self):
    yield self.owner
    for x in self.access_map:
      if x.can_delete or x.can_share:
        yield x.user
  deleters = property(_deleters)

  def _sharers(self):
    yield self.owner
    for x in self.access_map:
      if x.can_share:
        yield x.user
  sharers = property(_sharers)

# Many-to-many access map
# TODO: Later, maybe move to groups and not per-user.
class AccessMap(db.Model):
  mindmap = db.ReferenceProperty(Mindmap, required=True, collection_name='access_map')
  user = db.ReferenceProperty(User, required=True, collection_name='access_map')

  can_read = db.BooleanProperty(default=False)
  can_write = db.BooleanProperty(default=False)
  can_delete = db.BooleanProperty(default=False)
  can_share = db.BooleanProperty(default=False)

  created = db.DateTimeProperty(auto_now_add=True)
  modified = db.DateTimeProperty(auto_now_add=True, auto_now=True)



# Many-to-many so that 
class RevisionMap(db.Model):
  revision = db.ReferenceProperty(MindmapRevision, required=True, collection_name="container_map")
  container = db.ReferenceProperty(Mindmap, required=True, collection_name="revision_map")


class IndexPage(webapp.RequestHandler):
  def get(self):
    public_maps = Mindmap.all().filter('public = ', True).order('-modified').fetch(10)

    # TODO: move this into template code
    recent_maps = ""
    for mindmap in public_maps:
      recent_mindmaps += "<tr><td><a href='/mindmap/%d'>%s</a></td><td>%s</td></tr>" % (mindmap.key().id(), CGI.escape(mindmap.title), CGI.escape(mindmap.owner.user.nickname()))

    user = users.get_current_user()
    if not user:
      template_values = {
        'login_url' : users.create_login_url(self.request.uri),
        'recent_maps' : recent_maps,
      }
      path = os.path.join(os.path.dirname(__file__), 'templates/index.html')
      self.response.out.write(template.render(path, template_values))
    else:
      user_obj = User.all().filter('user = ', user).get()
      if not user_obj:
        # New user
        user_obj = User(user=user)
        user_obj.put()
      template_values = {
        'logout_url': users.create_logout_url(self.request.uri),
        'recent_maps' : public_maps,
        # TODO: add paging
        'your_maps' : Mindmap.all().filter('owner =', user_obj).fetch(20),
        'friend_maps' : user_obj.can_read,
      }
      path = os.path.join(os.path.dirname(__file__), 'templates/home.html')
      self.response.out.write(template.render(path, template_values))


class MindmapXmlHandler(webapp.RequestHandler):
  @login_required
  def get(self, id, revid):
    user = users.get_current_user()
    revision = None
    mindmap = Mindmap.get_by_id(int(id))

    if mindmap is None:
      logging.error('bad mindmap id')
      self.redirect('/')

    user_obj = User.all().filter('user = ', user).get()
    if not user_obj:
      # New user
      logging.warning('creating user "%s"' % user.nickname())
      user_obj = User(user=user)
      user_obj.put()

    can_access = False
    for u in mindmap.readers:
      if u.user == user:
        can_access = True
        break

    if not can_access:
      logging.error('permission denied for user "%s"' % (user.nickname()))
      self.redirect('/')

    if revid is None:
      revision = mindmap.latest
    else:
      revision = MindmapRevision.get_by_id(int(revid))

    self.response.headers['Content-Type'] = 'application/xml'
    self.response.out.write(revision.xmlmap)



class MindmapShareHandler(webapp.RequestHandler):
  @login_required
  def get(self, id, action, share_user):
    share_user = share_user.replace("%40", "@")
    suser = users.User(share_user)
    # TODO: error checking
    user = users.get_current_user()
    mindmap = Mindmap.get_by_id(int(id))
    if user is None or mindmap is None or suser is None:
      logging.error("something was none")
      self.redirect('/')

    user_obj = User.all().filter('user = ', user).get()
    if not user_obj:
      # New user
      logging.warning('creating user "%s"' % user.nickname())
      user_obj = User(user=user)
      user_obj.put()

    suser_obj = User.all().filter('user = ', suser).get()
    if not suser_obj:
      # New user
      logging.warning('creating user "%s"' % suser.nickname())
      suser_obj = User(user=suser)
      suser_obj.put()

    can_access = False
    for u in mindmap.readers:
      if u.user == user:
        can_access = True
        break

    if not can_access:
      logging.error('permission denied for user "%s"' % (user.nickname()))
      self.redirect('/')

    # Create a map entry
    # TODO: add del/unshare support
    if action == 'add':
      accessmap = AccessMap(mindmap=mindmap, user=suser_obj, can_share=True)
      accessmap.put()

    self.response.headers['Content-Type'] = 'text/html'
    self.response.out.write('map has been shared')


class MindmapHandler(webapp.RequestHandler):
  def get(self, id, revid):
    user = users.get_current_user()

    #if not user:
    #  self.redirect(users.create_login_url(self.request.uri))
    title = ''
    if user and id:
      mindmap = Mindmap.get_by_id(int(id))

      if mindmap is None:
        logging.error('bad mindmap id')
        self.redirect('/')

      user_obj = User.all().filter('user = ', user).get()
      if not user_obj:
        # New user
        logging.warning('creating user "%s"' % user.nickname())
        user_obj = User(user=user)
        user_obj.put()

      can_access = False
      for u in mindmap.readers:
        if u.user == user:
          can_access = True
          break

      if not can_access:
        logging.error('permission denied for user "%s"' % (user.nickname()))
        self.redirect('/')
      title = mindmap.title

    template_values = {
      'user': user,
      'logout_url': users.create_logout_url(self.request.uri),
      'id' : id,
      'revision' : revid,
      'title' : title,
    }
    path = os.path.join(os.path.dirname(__file__), 'mindweb/YMap_SVG.xhtml')
    self.response.headers['Content-Type'] = 'application/xhtml+xml'
    self.response.out.write(template.render(path, template_values))

  def cleanup(self, mindmap):
    # TODO:  delete revisions if more than N exist.
    pass

  def post(self, id, lastrevid):
    user = users.get_current_user()
    if not user:
      self.redirect(users.create_login_url(self.request.uri))
    user_obj = User.all().filter('user = ', user).get()
    if not user_obj:
      # New user
      user_obj = User(user=user)
      user_obj.put()
 

    # upload here
    mindmap = None
    title = self.request.get('title')
    if title == '':
      title = 'Unnamed mindmap'
    if id is None or id == '':
      mindmap = Mindmap(title=title, owner=user_obj)
    else:
      # Clean up old revisions if there are too many.
      self.cleanup(mindmap)
      mindmap = Mindmap.get_by_id(int(id))

    xmlmap = self.request.get('xml')
    if xmlmap is None or xmlmap == '':
      logging.error('xmlmap is empty!')
      self.redirect('/')

    # Short-circuit if there was no change.
    if mindmap.latest and mindmap.latest.xmlmap == xmlmap:
      self.response.out.write('/map/%d;%d' % (mindmap.key().id(), mindmap.latest.key().id()))
      return

    # Failure mode.
    # TODO: raise an exception
    # if xmlmap is None =='', etc
    revision = MindmapRevision(author=user_obj, title=title, xmlmap=xmlmap)
    revision.put()

    mindmap.latest = revision
    mindmap.put()
    revmap = RevisionMap(container=mindmap, revision=revision)
    revmap.put()
    # Let the XMLHttpRequest redirect if desired.
    self.response.out.write('/map/%d;%d' % (mindmap.key().id(), revision.key().id()))


application = webapp.WSGIApplication([
  ('/', IndexPage),
  ('/map/xml/(?:(\d+)(?:(?:;|%3B)(\d+))?)', MindmapXmlHandler),
  ('/map/(\d+)(?:;|%3B)(\d+)', MindmapHandler),
  ('/map/(\d+)()', MindmapHandler),
  ('/map/()()', MindmapHandler),
  ('/map/share/(\d+)/(add)/([^/]+)', MindmapShareHandler),
  ('/map/share/(\d+)/(del)/([^/]+)', MindmapShareHandler),
], debug=True)


def main():
  wsgiref.handlers.CGIHandler().run(application)


if __name__ == '__main__':
  main()
