# encoding: utf-8

# https://www.ptt.cc/bbs/Beauty/M.1445524234.A.2E1.html
# <div class="article-metaline">
#     <span class="article-meta-tag">作者</span>
#     <span class="article-meta-value">gaiaesque (一起來浸水桶吧)</span>
# </div>

# <div class="richcontent">
#     <img src="//i.imgur.com/OOGlbSX.jpg" alt="" />
# </div>
# <a href="http://i.imgur.com/mHSAUFp.jpg" target="_blank" rel="nofollow">http://i.imgur.com/mHSAUFp.jpg</a>

from lxml import html
import time
from datetime import datetime

def collect_images (tree):
    imgXPath = '//div[@id="main-content"]/div[@class="richcontent"]/img'
    return map(lambda x:x.attrib['src'].replace('//', 'http://'), filter(lambda img:'src' in img.attrib, tree.xpath(imgXPath)))

def collect_raw_meta (tree):
    metaKeyXPath = '//span[@class="article-meta-tag"]/text()'
    metaValXPath = '//span[@class="article-meta-value"]/text()'

    keys = tree.xpath(metaKeyXPath)
    vals = tree.xpath(metaValXPath)

    if len(keys) != len(vals):
        return {}
    else:
        { 
          '作者': 'gaiaesque (一起來浸水桶吧)',
          '看板': 'Beauty',
          '標題': '[正妹] 平祐奈 甜美正妹',
          '時間': 'Thu Oct 22 22:30:31 2015'
        }
        return dict(zip(keys, vals))

def collect_meta(raw_meta):
    meta = {
        'author': '',
        'datetime': ''
    }
    if u'作者' in raw_meta:
        meta['author'] = raw_meta[u'作者']
    if u'時間' in raw_meta:
        # time.struct_time(
        #     tm_year=2015, 
        #     tm_mon=11,
        #     ...
        # )
        struct_time = time.strptime(raw_meta[u'時間'].strip())
        # datetime.datetime(2015, 11, 5, 5, 24, 47)
        meta['datetime'] = datetime.utcfromtimestamp(time.mktime(struct_time))
    return meta

if __name__ == '__main__':

    from pprint import pprint

    page = open('M.1445524234.A.2E1.html').read()
    tree = html.fromstring(page)

    imgs = collect_images(tree)

    raw_meta = collect_raw_meta(tree)

    meta = collect_meta(raw_meta)

    pprint(meta)
    pprint(imgs)
