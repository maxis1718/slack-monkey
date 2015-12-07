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
import re
# import requests
# page = requests.get('http://econpy.pythonanywhere.com/ex/001.html')
# tree = html.fromstring(page.text)

def getFirst (l, default):
    return default if len(l) == 0 else l[0]

def merge_dicts(*dict_args):
    '''
    Given any number of dicts, shallow copy and merge into a new dict,
    precedence goes to key value pairs in latter dicts.
    '''
    result = {}
    for dictionary in dict_args:
        result.update(dictionary)
    return result

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
        'full_title': title,
        'url': url,
        'push': push,
        'mark': mark
    }
    return info

def _beauty (info):
    return info['title'].startswith(u'[正妹]')

def _handsome (info):
    return info['title'].startswith(u'[帥哥]')

def collect_post (tree):
    # [{'full_title': u'[\u5e25\u54e5] \u6211\u7684\u5e25\u54e5\u670b\u53cb\u6b63\u6069',
    #   'mark': 'M',
    #   'push': 74,
    #   'tag': u'\u5e25\u54e5',
    #   'title': u'\u6211\u7684\u5e25\u54e5\u670b\u53cb\u6b63\u6069',
    #   'url': 'https://www.ptt.cc/bbs/Beauty/M.1445522572.A.DCC.html'},
    #   ...
    # ]
    postXPath = '//div[@class="r-ent"]'
    raw_posts = tree.xpath(postXPath)

    # filter out posts with empty info and make sure full_title is extracted
    collected_posts = filter(lambda post:bool(post) and 'full_title' in post, map(collect_post_info, raw_posts))

    # extract tag and title
    posts_tag_title = map(get_tag_title, collected_posts)

    # merge the tag/title info into collected posts
    posts = map(lambda x:merge_dicts(x[0], x[1]), zip(collected_posts, posts_tag_title))

    return posts

def get_tag_title(post):
    # [正妹] 平祐奈 甜美正妹
    # [正妹] 黑嘉嘉
    # [公告] 《誰來表特》豆花妹海報已寄出
    # [廣告] 療癒人心的笑容...
    # [正妹] 俞俐均
    # [帥哥] 我的帥哥朋友正恩
    # ［帥哥］華航新人型立牌
    # Re: [神人] 都好正
    # {'tag': u'\u5e25\u54e5',
    #  'title': u'\u6211\u7684\u5e25\u54e5\u670b\u53cb\u6b63\u6069'}
    
    # try to extract [TAG] TITLE
    res = re.findall(ur'\[([^\]]+)\]([^$]+)$', post['full_title'])
    
    if len(res) == 0:
        # extract ［TAG］ TITLE
        res = re.findall(ur'［([^］]+)］([^$]+)$', post['full_title'])
    
    tag, title = u'表特', post['full_title']

    # override default tag and title if content extracted
    if len(res) > 0 and len(res[0]) == 2:
        tag, title = map(lambda x:x.strip(), res[0])

    return {
        'tag': tag,
        'title': title
    }

def find_prev (tree):
    xpath = '//div[@class="btn-group pull-right"]/a'
    prev_btn = getFirst(filter(lambda btn:u'上頁' in btn.text, tree.xpath(xpath)), None)
    if prev_btn is None:
        prev_url = None
    else:
        prev_url = urljoin('https://www.ptt.cc', prev_btn.attrib['href'])
    return prev_url

if __name__ == '__main__':

    from pprint import pprint

    page = open('index1625.html').read()
    tree = html.fromstring(page)

    posts = collect_post(tree)
    next_url = find_next(tree)

    pprint(posts)
    pprint(handsome)
    pprint(next_url)

