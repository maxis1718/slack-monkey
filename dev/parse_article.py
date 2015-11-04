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
# import requests
# page = requests.get('http://econpy.pythonanywhere.com/ex/001.html')
# tree = html.fromstring(page.text)

def collect_images (tree):
    imgXPath = '//div[@id="main-content"]/div[@class="richcontent"]/img'
    return map(lambda x:x.attrib['src'].replace('//', 'http://'), filter(lambda img:'src' in img.attrib, tree.xpath(imgXPath)))

def collect_meta (tree):
    metaKeyXPath = '//span[@class="article-meta-tag"]/text()'
    metaValXPath = '//span[@class="article-meta-value"]/text()'

    keys = tree.xpath(metaKeyXPath)
    vals = tree.xpath(metaValXPath)

    if len(keys) != len(vals):
        return {}
    else:
        # { 
        #   '作者': 'gaiaesque (一起來浸水桶吧)',
        #   '看板': 'Beauty',
        #   '標題': '[正妹] 平祐奈 甜美正妹',
        #   '時間': 'Thu Oct 22 22:30:31 2015'
        # }
        return dict(zip(keys, vals))

if __name__ == '__main__':

    from pprint import pprint

    page = open('M.1445524234.A.2E1.html').read()
    tree = html.fromstring(page)

    imgs = collect_images(tree)

    meta = collect_meta(tree)

    pprint(meta)
    pprint(imgs)
