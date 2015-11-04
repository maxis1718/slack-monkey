# encoding: utf-8

# https://www.ptt.cc/bbs/Beauty/index1625.html
# <div class="r-ent">
#     <div class="nrec"><span class="hl f1">爆</span></div>
#     <div class="mark">M</div>
#     <div class="title">
#         <a href="/bbs/Beauty/M.1445533377.A.E31.html">[正妹] 黑嘉嘉</a>
#     </div>
#     <div class="meta">
#         <div class="date">10/23</div>
#         <div class="author">a000000jet</div>
#     </div>
# </div>

from lxml import html
from urlparse import urljoin
# import requests
# page = requests.get('http://econpy.pythonanywhere.com/ex/001.html')
# tree = html.fromstring(page.text)

def getFirst (l, default):
    return default if len(l) == 0 else l[0]

def collect_post_info (post):

    titleElement = getFirst(post.xpath('div[@class="title"]/a'), None)

    if titleElement is not None:
        if 'href' in titleElement.attrib:
            url = titleElement.attrib['href']
            title = titleElement.text
        else:
            # skip if no href to the article
            return {}
    else:
        # skip if no title element found
        return {}

    push = getFirst(post.xpath('div[@class="nrec"]/span/text()'), '')
    mark = getFirst(post.xpath('div[@class="mark"]/text()'), '')

    # build absolute url
    url = urljoin('https://www.ptt.cc', url)

    # convert push to number
    if push == u'爆':
        push = 100
    else:
        try:
            push = int(push)
        except ValueError:
            push = 0

    info = {
        'title': title,
        'url': url,
        'push': push,
        'mark': mark
    }
    return info

def _beauty (info):
    return info['title'].startswith(u'[正妹]')

def _handsome (info):
    return info['title'].startswith(u'[帥哥]')

def collect_post (tree, constraint):
    postXPath = '//div[@class="r-ent"]'
    posts = tree.xpath(postXPath)

    collected_posts = map(collect_post_info, posts)
    return filter(constraint, collected_posts)

if __name__ == '__main__':

    from pprint import pprint

    page = open('index1625.html').read()
    tree = html.fromstring(page)

    handsome = collect_post(tree, _handsome)
    beauty = collect_post(tree, _beauty)

    pprint(beauty)
    pprint(handsome)
