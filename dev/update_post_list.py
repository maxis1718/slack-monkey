# encoding: utf-8

# https://www.ptt.cc/bbs/Beauty/index.html
# get posts list
# parse list and get posts
# request posts and save to mongo
# explore 上頁
# db.beauty.lists.createIndex({ push: -1 })

from pymongo import MongoClient
from lxml import html
import requests
import parse_list
import re
import time
import random
import sys
import getopt

uri = 'mongodb://localhost:27017/slack'
#uri = 'mongodb://beauty:beauty@ds049754.mongolab.com:49754/slack'

mc = MongoClient(uri)
db = mc['slack']
co_list = db['beauty.lists']

def get_page_tree(url):
    page = requests.get(url)
    tree = html.fromstring(page.text)
    return tree

def add_post_id(post):
    # {
    #  'title': '[正妹] 又正又會讀書',
    #  'url': 'https://www.ptt.cc/bbs/Beauty/M.1446701090.A.658.html',
    #  ...,
    #  'post_id': 'M.1446701090.A.658'
    # }
    post['post_id'] = post['url'].split('/')[-1].split('.html')[0]

def save_post_to_mongo(co, post):
    query = { 'post_id': post['post_id'] }
    mdoc = co.find_one(query)
    if mdoc is None:
        # not existed, insert
        res = co.insert_one(post)
        print '(inserted)'
    else:
        # update push and mark fields
        update = {}
        for key in ['push', 'mark']:
            if key in post:
                update[key] = post[key]
        res = co.update_one(query, {'$set': update })
        print '(updated)'
    return res

def get_current_list_id(entry, prev_url):
    if entry.endswith('index.html'):
        list_id = int(re.findall(r'index([0-9]+)\.htm', prev_url)[0]) + 1
    else:
        list_id = int(re.findall(r'index([0-9]+)\.htm', entry)[0])
    return list_id

def get_full_entry_url(entry, list_id):
    if entry.endswith('index.html'):
        entry_url = entry.replace('/index.html', '/index' + str(list_id) + '.html')
    else:
        entry_url = entry
    return entry_url


def usage():
    print '''Usage:
    python %s [options]
        -u, --url: entry url (https://www.ptt.cc/bbs/Beauty/index1661.html)
        -n, --number: total number of pages
    '''
    exit()

if __name__ == '__main__':

    entry = 'https://www.ptt.cc/bbs/Beauty/index.html'
    total = 30

    try:
        opts, args = getopt.getopt(sys.argv[1:], "hu:n:", ["help","url=","number="])
        for opt, arg in opts:
            if opt == "-u" or opt == "--url":
                entry = arg
            elif opt == "-n" or opt == "--number":
                total = int(arg)
            elif opt == "-h" or opt == "--help":
                usage()
    except getopt.GetoptError as err:
        usage()

    processed = 0
    while processed < total:

        tree = get_page_tree(entry)

        # extract the prev_url, and make it as next entry
        # https://www.ptt.cc/bbs/Beauty/index1636.html
        prev_url = parse_list.find_prev(tree)

        # for debug
        # index.html --> index1637.html
        list_id = get_current_list_id(entry, prev_url)
        entry_url = get_full_entry_url(entry, list_id)
        print '> entry:', entry_url

        post_lists = parse_list.collect_post(tree)
        print '> found', len(post_lists), 'posts'

        # add post_id
        for post in post_lists:
            add_post_id(post)

        # update to beauty.lists
        # query by post_id and update entire post
        for i, post in enumerate(post_lists):
            print '  > save', post['title'], '(', i+1, '/', len(post_lists), ')', '...',
            sys.stdout.flush()
            save_post_to_mongo(co_list, post)

        wait = random.randrange(1,5)
        print '> wait for', wait, 'secs'
        time.sleep(wait)

        processed += 1

        # update entry point
        entry = prev_url

    mc.close()

