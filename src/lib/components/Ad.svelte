<script lang="ts">
  import { onMount } from 'svelte';
  import { browser } from '$app/environment';
  

  export let enableAds: boolean = true;
</script>

<div id="frame" class="ad-container">
  <iframe 
    data-aa='2391419' 
    src='//acceptable.a-ads.com/2391419' 
    style='border:0px; padding:0; width:100%; height:100%; overflow:hidden; background-color: transparent;'>
  </iframe>
  <a 
    style="display: block; text-align: right; font-size: 12px;" 
    id="preview-link" 
    href="https://aads.com/campaigns/new/?source_id=2391419&source_type=ad_unit&partner=2391419">
    Advertise here
  </a>
</div>

<style>
  .ad-container {
    width: 100%;
    height: 90px;
    margin: 20px auto;
    max-width: 728px;
    position: relative;
    background-color: rgba(33, 33, 43, 0.2);
    border-radius: 4px;
    overflow: visible;
  }
</style>
