var posts=["2025/01/14/hello-world/","2023/12/26/test1/"];function toRandomPost(){
    pjax.loadUrl('/'+posts[Math.floor(Math.random() * posts.length)]);
  };