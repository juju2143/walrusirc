<!DOCTYPE html>
<html>
<head>
<title>Index of /</title>
</head>
<body>
<h1>Index of /</h1>
<table>
<tr>
<th>Name</th><th>Uploaded by</th><th>Size</th><th>Date</th>
</tr>
<tr><th colspan="4"><hr></th></tr>
<?php
$config = json_decode(file_get_contents("../config.json"));
$mysql = mysqli_connect($config->mysql->host, $config->mysql->user, $config->mysql->password, $config->mysql->database);
$query = mysqli_query($mysql, "SELECT * FROM irc_uploads ORDER BY filename ASC;");
while($data = mysqli_fetch_assoc($query))
{
  echo "<tr>";
  echo "<td><a href=\"".$data['filename']."\">".$data['filename']."</a></td>";
  echo "<td>".$data['nick']."</td>";
  echo "<td>".filesize($data['filename'])."</td>";
  echo "<td>".date("Y-m-d H:i:s", $data['time'])."</td>";
  echo "</tr>";
}
?>
<tr><th colspan="4"><hr></th></tr>
</table>
<address>walrusirc/<?php echo shell_exec("git describe --long")." Server at ".$_SERVER['HTTP_HOST']." Port ".$_SERVER['SERVER_PORT']; ?></address>
</body>
</html>
