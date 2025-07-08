<?php
$instance['Betatest'] = array(
    "background_url" => "http://localhost/videos/betatest.mp4"
);

$instance['Backrooms'] = array(
    "background_url" => "http://localhost/videos/backrooms.mp4"
);

header('Content-Type: application/json');
echo json_encode($instance);
?>
